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
   * Stripe Checkout Session Completed Webhook
   * Handles successful Stripe Checkout payments
   */
  'stripe-checkout-completed': async (payload, context) => {
    const session = payload.data?.object
    if (!session) {
      console.error('[webhook] No session in payload')
      return { emitEvent: false }
    }

    console.log('[webhook] Stripe Checkout Completed:', {
      sessionId: session.id,
      orderId: session.client_reference_id,
      amount: session.amount_total,
      status: session.payment_status,
    })

    const { adminClient } = context
    const orderId = session.client_reference_id
    const metadata = session.metadata || {}

    if (!orderId) {
      console.error('[webhook] No order ID in session')
      return { emitEvent: false }
    }

    try {
      // 1. Update order status to 'paid'
      const { data: order, error: orderError } = await adminClient
        .from('orders')
        .update({
          status: 'paid',
          stripe_payment_intent_id: session.payment_intent,
        })
        .eq('id', orderId)
        .select('*, user_id')
        .single()

      if (orderError || !order) {
        console.error('[webhook] Failed to update order:', orderError)
        throw new Error('Failed to update order')
      }

      // 2. Get product and variant info from order metadata
      const variantId = metadata.variant_id || order.metadata?.variant_id
      const productId = metadata.product_id || order.metadata?.product_id
      const productType = metadata.product_type || 'digital'
      const quantity = order.metadata?.quantity || 1

      // Get variant and product details
      const { data: variant } = await adminClient
        .from('product_variants')
        .select('*, product:products(*)')
        .eq('id', variantId)
        .single()

      const product = variant?.product

      // 3. Create order_item
      const { data: orderItem, error: itemError } = await adminClient
        .from('order_items')
        .insert({
          order_id: orderId,
          product_id: productId,
          variant_id: variantId,
          product_name: product?.name || 'Unknown Product',
          variant_name: variant?.name,
          quantity,
          unit_price: variant?.price_amount || 0,
          subtotal: (variant?.price_amount || 0) * quantity,
          product_type: productType,
          product_metadata: {
            ...product?.metadata,
            ...variant?.metadata,
          },
        })
        .select('id')
        .single()

      if (itemError || !orderItem) {
        console.error('[webhook] Failed to create order item:', itemError)
        throw new Error('Failed to create order item')
      }

      // 4. Create and execute fulfillment
      const fulfillmentResult = await executeFulfillment(
        adminClient,
        orderItem.id,
        order.user_id,
        productType,
        { ...product?.metadata, ...variant?.metadata }
      )

      // 5. Update order to fulfilled
      await adminClient
        .from('orders')
        .update({
          status: 'fulfilled',
          fulfilled_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      console.log('[webhook] Order fulfilled:', {
        orderId,
        orderItemId: orderItem.id,
        fulfillmentResult,
      })

      return {
        emitEvent: true,
        eventName: 'checkout-completed',
        payload: {
          orderId,
          userId: order.user_id,
          sessionId: session.id,
          amount: session.amount_total,
          productType,
          fulfillmentResult,
        },
        priority: 5,
      }

    } catch (error: any) {
      console.error('[webhook] Checkout processing error:', error)

      // Mark order as failed
      await adminClient
        .from('orders')
        .update({
          status: 'cancelled',
          metadata: {
            error: error.message,
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', orderId)

      throw error
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

/**
 * Execute fulfillment based on product type
 */
async function executeFulfillment(
  adminClient: SupabaseClient,
  orderItemId: string,
  userId: string,
  productType: string,
  metadata: any
): Promise<any> {
  // Create fulfillment record
  const { data: fulfillment, error: fulfillmentError } = await adminClient
    .from('fulfillments')
    .insert({
      order_item_id: orderItemId,
      fulfillment_type: productType,
      status: 'pending',
    })
    .select('id')
    .single()

  if (fulfillmentError || !fulfillment) {
    throw new Error('Failed to create fulfillment')
  }

  let result: any = {}
  let errorMessage: string | null = null

  try {
    switch (productType) {
      case 'token_pack': {
        // Add tokens to user quota
        const tokenAmount = metadata?.token_amount || 0

        // Get current balance
        const { data: currentQuota } = await adminClient
          .from('user_quotas')
          .select('llm_tokens_remaining')
          .eq('user_id', userId)
          .single()

        const currentBalance = currentQuota?.llm_tokens_remaining || 0
        const newBalance = currentBalance + tokenAmount

        // Update or insert quota
        const { error: quotaError } = await adminClient
          .from('user_quotas')
          .upsert({
            user_id: userId,
            llm_tokens_remaining: newBalance,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          })

        if (quotaError) {
          throw new Error(`Failed to update quota: ${quotaError.message}`)
        }

        result = {
          tokens_added: tokenAmount,
          previous_balance: currentBalance,
          new_balance: newBalance,
        }
        break
      }

      case 'feature': {
        // Enable feature for user
        const featureKey = metadata?.feature_key
        if (!featureKey) {
          throw new Error('No feature_key in metadata')
        }

        const { error: featureError } = await adminClient
          .from('user_features')
          .upsert({
            user_id: userId,
            feature_key: featureKey,
            enabled: true,
            enabled_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,feature_key',
          })

        if (featureError) {
          throw new Error(`Failed to enable feature: ${featureError.message}`)
        }

        result = {
          feature_key: featureKey,
          enabled: true,
        }
        break
      }

      case 'digital':
      default: {
        // For digital products, just mark as completed
        // Actual access control should be handled by RLS or other mechanisms
        result = {
          product_type: productType,
          fulfilled: true,
        }
        break
      }
    }

  } catch (error: any) {
    errorMessage = error.message
    console.error('[fulfillment] Error:', error)
  }

  // Update fulfillment status
  await adminClient
    .from('fulfillments')
    .update({
      status: errorMessage ? 'failed' : 'completed',
      result,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', fulfillment.id)

  if (errorMessage) {
    throw new Error(errorMessage)
  }

  return result
}
