/**
 * Webhook Handlers
 *
 * VibeCoding: Add new handlers here to support new webhook types
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Webhook Handler Context
 */
export interface WebhookContext {
  webhook: any  // webhooks table record
  adminClient: SupabaseClient
  req: Request
}

/**
 * Webhook Handler Result
 */
export interface WebhookHandlerResult {
  emitEvent?: boolean           // Register to Event System (default: true)
  eventName?: string            // Event name (default: handler_name)
  payload?: any                 // Payload for Event System (default: original payload)
  priority?: number             // Event priority
}

/**
 * Webhook Handler Function Type
 */
export type WebhookHandler = (
  payload: any,
  context: WebhookContext
) => Promise<WebhookHandlerResult>

/**
 * Webhook Handlers
 *
 * VibeCoding: Just add a new handler here to support a new webhook type
 */
export const webhookHandlers: Record<string, WebhookHandler> = {
  /**
   * GitHub Push Webhook
   */
  'github-push': async (payload, context) => {
    console.log('[webhook] GitHub Push:', {
      repo: payload.repository?.full_name,
      ref: payload.ref,
      commits: payload.commits?.length,
    })

    // Example: Only process main branch pushes
    if (payload.ref !== 'refs/heads/main') {
      console.log('[webhook] Skipping non-main branch push')
      return { emitEvent: false }
    }

    // Register to Event System (for Job execution, etc.)
    return {
      emitEvent: true,
      eventName: 'push',
      payload: {
        repository: payload.repository.full_name,
        commits: payload.commits,
        pusher: payload.pusher,
        ref: payload.ref,
      },
      priority: 10,  // High priority
    }
  },

  /**
   * Stripe Payment Succeeded Webhook
   */
  'stripe-payment-succeeded': async (payload, context) => {
    console.log('[webhook] Stripe Payment Succeeded:', {
      amount: payload.data?.object?.amount,
      currency: payload.data?.object?.currency,
      customer: payload.data?.object?.customer,
    })

    const paymentIntent = payload.data.object

    // Example: Update user quota logic
    // await context.adminClient.from('user_quotas').update(...)

    return {
      emitEvent: true,
      eventName: 'payment-succeeded',
      payload: {
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customer: paymentIntent.customer,
        paymentIntentId: paymentIntent.id,
      },
    }
  },

  /**
   * Slack Interactive Message Webhook
   */
  'slack-interactive': async (payload, context) => {
    console.log('[webhook] Slack Interactive:', {
      type: payload.type,
      user: payload.user?.id,
      actions: payload.actions,
    })

    // Example: Handle Slack button clicks

    return {
      emitEvent: true,
      eventName: 'interactive',
      payload: {
        type: payload.type,
        user: payload.user,
        actions: payload.actions,
        responseUrl: payload.response_url,
      },
    }
  },

  /**
   * Custom Webhook (Sample)
   */
  'custom-webhook': async (payload, context) => {
    console.log('[webhook] Custom Webhook:', payload)

    // Custom logic here
    // ...

    return {
      emitEvent: true,
      payload,
    }
  },
}
