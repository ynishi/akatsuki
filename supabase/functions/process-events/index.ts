/**
 * Process Events Edge Function
 *
 * Processes pending system events by invoking registered handlers
 * Called by Cron every minute
 *
 * Now supports job:* events for async job processing
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { jobHandlers } from '../execute-async-job/handlers.ts'

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

    // Get active handlers (for non-job events)
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
        // ========== JOB PROCESSING (job:* events) ==========
        if (event.event_type.startsWith('job:')) {
          return await processJob(supabase, event)
        }

        // ========== REGULAR EVENT PROCESSING ==========
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

// ========== JOB PROCESSING FUNCTION ==========
async function processJob(supabase: any, event: SystemEvent) {
  const jobType = event.event_type.replace('job:', '')
  const handler = jobHandlers[jobType]

  if (!handler) {
    console.warn(`No handler for job type: ${jobType}`)
    await supabase.rpc('complete_event', { event_id: event.id })
    return {
      eventId: event.id,
      eventType: event.event_type,
      status: 'completed',
      message: 'No handler registered'
    }
  }

  try {
    // Mark as processing
    await supabase
      .from('system_events')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', event.id)

    console.log(`▶ Processing job ${event.id} (type: ${jobType})`)

    // Progress update helper
    const updateProgress = async (progress: number) => {
      await supabase
        .from('system_events')
        .update({ progress: Math.min(100, Math.max(0, progress)) })
        .eq('id', event.id)
    }

    // Context for handler
    const context = {
      supabase,
      jobId: event.id,
      updateProgress
    }

    // Execute handler
    const result = await handler(event.payload, context)

    // Mark as completed
    await supabase
      .from('system_events')
      .update({
        status: 'completed',
        progress: 100,
        result,
        processed_at: new Date().toISOString()
      })
      .eq('id', event.id)

    console.log(`✓ Job ${event.id} completed successfully`)

    return {
      eventId: event.id,
      eventType: event.event_type,
      status: 'completed',
      result
    }

  } catch (error: any) {
    console.error(`✗ Job ${event.id} failed:`, error)

    await supabase
      .from('system_events')
      .update({
        status: 'failed',
        error_message: error.message || 'Unknown error',
        processed_at: new Date().toISOString()
      })
      .eq('id', event.id)

    // Retry logic via fail_event RPC
    await supabase.rpc('fail_event', {
      event_id: event.id,
      error_msg: error.message || String(error)
    })

    return {
      eventId: event.id,
      eventType: event.event_type,
      status: 'failed',
      error: error.message,
      retryCount: event.retry_count + 1
    }
  }
}
