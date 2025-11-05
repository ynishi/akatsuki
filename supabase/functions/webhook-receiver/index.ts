// Webhook Receiver Edge Function
// Receives webhooks from external services (GitHub, Stripe, Slack, etc.)
//
// Usage:
// POST /functions/v1/webhook-receiver?name=github-push
//
// Features:
// - Dynamic webhook configuration (DB-driven)
// - Signature verification (provider-specific)
// - Audit logging (webhook_logs table)
// - Event System integration (system_events table)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { webhookHandlers } from './handlers.ts'
import { verifySignature } from './verify.ts'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  // Get webhook name from query parameter
  const url = new URL(req.url)
  const webhookName = url.searchParams.get('name')

  if (!webhookName) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing webhook name in query parameter (?name=xxx)',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Create admin client (Service Role)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let requestBody: string
  let requestHeaders: Record<string, string>

  try {
    requestBody = await req.text()
    requestHeaders = Object.fromEntries(req.headers.entries())

    console.log('[webhook-receiver] Received webhook:', {
      name: webhookName,
      method: req.method,
      contentLength: requestBody.length,
    })

    // 1. Get webhook configuration
    const { data: webhook, error: webhookError } = await adminClient
      .from('webhooks')
      .select('*')
      .eq('name', webhookName)
      .eq('is_active', true)
      .single()

    if (webhookError || !webhook) {
      console.error('[webhook-receiver] Webhook not found:', webhookName)

      // Log: not_found
      await adminClient.from('webhook_logs').insert({
        webhook_name: webhookName,
        request_method: req.method,
        request_headers: requestHeaders,
        request_body: JSON.parse(requestBody || '{}'),
        status: 'not_found',
        error_message: 'Webhook not found or inactive',
        processing_time_ms: Date.now() - startTime,
      })

      return new Response(
        JSON.stringify({
          success: false,
          error: `Webhook '${webhookName}' not found or inactive`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 2. Signature verification
    const signature = requestHeaders[webhook.signature_header.toLowerCase()]
    const isValid = await verifySignature(
      requestBody,
      signature,
      webhook.secret_key,
      webhook.signature_algorithm,
      webhook.provider
    )

    if (!isValid) {
      console.error('[webhook-receiver] Signature verification failed')

      // Log: signature_failed
      await adminClient.from('webhook_logs').insert({
        webhook_id: webhook.id,
        webhook_name: webhookName,
        request_method: req.method,
        request_headers: requestHeaders,
        request_body: JSON.parse(requestBody),
        status: 'signature_failed',
        error_message: 'Signature verification failed',
        processing_time_ms: Date.now() - startTime,
      })

      // Update webhook stats (failed count)
      await adminClient
        .from('webhooks')
        .update({
          failed_count: webhook.failed_count + 1,
          last_received_at: new Date().toISOString(),
        })
        .eq('id', webhook.id)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Signature verification failed',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. Get handler
    const handler = webhookHandlers[webhook.handler_name]
    if (!handler) {
      console.error('[webhook-receiver] Handler not found:', webhook.handler_name)

      // Log: handler_failed
      await adminClient.from('webhook_logs').insert({
        webhook_id: webhook.id,
        webhook_name: webhookName,
        request_method: req.method,
        request_headers: requestHeaders,
        request_body: JSON.parse(requestBody),
        status: 'handler_failed',
        error_message: `Handler '${webhook.handler_name}' not found`,
        processing_time_ms: Date.now() - startTime,
      })

      return new Response(
        JSON.stringify({
          success: false,
          error: `Handler '${webhook.handler_name}' not found`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let systemEventId: string | undefined

    try {
      // 4. Execute handler
      const payload = JSON.parse(requestBody)
      const result = await handler(payload, {
        webhook,
        adminClient,
        req,
      })

      console.log('[webhook-receiver] Handler result:', {
        emitEvent: result.emitEvent !== false,
        eventName: result.eventName,
      })

      // 5. Register to Event System
      if (result.emitEvent !== false) {
        const eventType = `${webhook.event_type_prefix}:${result.eventName || webhook.handler_name}`
        const { data: event, error: eventError } = await adminClient
          .from('system_events')
          .insert({
            event_type: eventType,
            payload: result.payload || payload,
            status: 'pending',
            priority: result.priority || 0,
          })
          .select('id')
          .single()

        if (eventError) {
          console.error('[webhook-receiver] Failed to create event:', eventError)
        } else {
          systemEventId = event?.id
          console.log('[webhook-receiver] Created event:', systemEventId)
        }
      }

      // 6. Log: success
      const { data: log } = await adminClient.from('webhook_logs').insert({
        webhook_id: webhook.id,
        webhook_name: webhookName,
        request_method: req.method,
        request_headers: requestHeaders,
        request_body: JSON.parse(requestBody),
        status: 'success',
        processing_time_ms: Date.now() - startTime,
        system_event_id: systemEventId,
      }).select('id').single()

      // 7. Update webhook stats (success count)
      await adminClient
        .from('webhooks')
        .update({
          received_count: webhook.received_count + 1,
          last_received_at: new Date().toISOString(),
        })
        .eq('id', webhook.id)

      console.log('[webhook-receiver] Success:', {
        webhookLogId: log?.id,
        systemEventId,
      })

      return new Response(
        JSON.stringify({
          success: true,
          webhook_log_id: log?.id,
          system_event_id: systemEventId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )

    } catch (handlerError: any) {
      console.error('[webhook-receiver] Handler execution error:', handlerError)

      // Log: handler_failed
      await adminClient.from('webhook_logs').insert({
        webhook_id: webhook.id,
        webhook_name: webhookName,
        request_method: req.method,
        request_headers: requestHeaders,
        request_body: JSON.parse(requestBody),
        status: 'handler_failed',
        error_message: handlerError.message,
        processing_time_ms: Date.now() - startTime,
      })

      // Update webhook stats (failed count)
      await adminClient
        .from('webhooks')
        .update({
          failed_count: webhook.failed_count + 1,
          last_received_at: new Date().toISOString(),
        })
        .eq('id', webhook.id)

      return new Response(
        JSON.stringify({
          success: false,
          error: handlerError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error: any) {
    console.error('[webhook-receiver] Unexpected error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
