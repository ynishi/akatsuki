/**
 * Process Events Edge Function
 *
 * Processes pending system events by invoking registered handlers
 * Called by Cron every minute
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SystemEvent {
  id: string
  event_type: string
  payload: Record<string, any>
  status: string
  retry_count: number
  max_retries: number
  user_id: string | null
  created_at: string
}

interface EventHandler {
  id: string
  event_type: string
  handler_function: string
  is_active: boolean
  max_retries: number
  timeout_seconds: number
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get pending events (batch of 10)
    const { data: events, error: eventsError } = await supabase
      .rpc('get_pending_events', { batch_size: 10 })

    if (eventsError) {
      console.error('Failed to get pending events:', eventsError)
      throw eventsError
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending events',
          processed: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${events.length} events`)

    // Get active handlers
    const { data: handlers, error: handlersError } = await supabase
      .from('event_handlers')
      .select('*')
      .eq('is_active', true)

    if (handlersError) {
      console.error('Failed to get handlers:', handlersError)
      throw handlersError
    }

    const handlerMap = new Map<string, EventHandler>()
    handlers?.forEach((h: EventHandler) => {
      handlerMap.set(h.event_type, h)
    })

    // Process each event
    const results = await Promise.allSettled(
      events.map(async (event: SystemEvent) => {
        const handler = handlerMap.get(event.event_type)

        if (!handler) {
          console.warn(`No handler registered for event type: ${event.event_type}`)

          // Mark as completed (no handler = nothing to do)
          await supabase.rpc('complete_event', { event_id: event.id })

          return {
            eventId: event.id,
            eventType: event.event_type,
            status: 'completed',
            message: 'No handler registered'
          }
        }

        try {
          // Invoke handler Edge Function
          const handlerUrl = `${supabaseUrl}/functions/v1/${handler.handler_function}`

          const response = await fetch(handlerUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_id: event.id,
              event_type: event.event_type,
              payload: event.payload,
              user_id: event.user_id,
            }),
            signal: AbortSignal.timeout(handler.timeout_seconds * 1000),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Handler failed: ${response.status} - ${errorText}`)
          }

          // Mark as completed
          await supabase.rpc('complete_event', { event_id: event.id })

          return {
            eventId: event.id,
            eventType: event.event_type,
            status: 'completed',
            handler: handler.handler_function
          }
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error)

          // Mark as failed (with retry logic)
          await supabase.rpc('fail_event', {
            event_id: event.id,
            error_msg: error instanceof Error ? error.message : String(error)
          })

          return {
            eventId: event.id,
            eventType: event.event_type,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            retryCount: event.retry_count + 1
          }
        }
      })
    )

    // Summarize results
    const summary = {
      total: events.length,
      completed: results.filter(r => r.status === 'fulfilled' && r.value.status === 'completed').length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')).length,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', reason: r.reason })
    }

    console.log('Processing summary:', summary)

    return new Response(
      JSON.stringify({
        success: true,
        summary
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process events error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
