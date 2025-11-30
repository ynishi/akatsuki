/**
 * Stripe Checkout Edge Function
 *
 * Creates a Stripe Checkout Session for purchasing products.
 *
 * POST /functions/v1/stripe-checkout
 * Body: {
 *   variant_id: string (UUID of product_variant)
 *   quantity?: number (default: 1)
 *   success_url?: string
 *   cancel_url?: string
 * }
 *
 * Returns: {
 *   checkout_url: string
 *   session_id: string
 *   order_id: string
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

interface CheckoutRequest {
  variant_id: string
  quantity?: number
  success_url?: string
  cancel_url?: string
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get auth user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: CheckoutRequest = await req.json()
    const { variant_id, quantity = 1, success_url, cancel_url } = body

    if (!variant_id) {
      return new Response(
        JSON.stringify({ error: 'variant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for DB operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get variant with product info
    const { data: variant, error: variantError } = await adminClient
      .from('product_variants')
      .select(`
        *,
        product:products(*)
      `)
      .eq('id', variant_id)
      .eq('is_active', true)
      .single()

    if (variantError || !variant) {
      return new Response(
        JSON.stringify({ error: 'Product variant not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!variant.product || !variant.product.is_active) {
      return new Response(
        JSON.stringify({ error: 'Product not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const product = variant.product
    const totalAmount = variant.price_amount * quantity

    // Create order in pending state
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        total_amount: totalAmount,
        currency: variant.currency,
        metadata: {
          variant_id: variant.id,
          product_id: product.id,
          quantity,
        },
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[stripe-checkout] Failed to create order:', orderError)
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine URLs
    const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    const finalSuccessUrl = success_url || `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`
    const finalCancelUrl = cancel_url || `${origin}/purchase/cancel`

    // Create Stripe Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: {
        order_id: order.id,
        user_id: user.id,
        variant_id: variant.id,
        product_id: product.id,
        product_type: product.product_type,
      },
      line_items: [
        {
          price_data: {
            currency: variant.currency,
            product_data: {
              name: product.name,
              description: variant.name,
              ...(product.image_url && { images: [product.image_url] }),
            },
            unit_amount: variant.price_amount,
          },
          quantity,
        },
      ],
    }

    // If Stripe Price ID exists, use it instead
    if (variant.stripe_price_id) {
      sessionParams.line_items = [
        {
          price: variant.stripe_price_id,
          quantity,
        },
      ]
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Update order with Stripe session ID
    await adminClient
      .from('orders')
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq('id', order.id)

    console.log('[stripe-checkout] Created session:', {
      sessionId: session.id,
      orderId: order.id,
      userId: user.id,
      amount: totalAmount,
    })

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        order_id: order.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[stripe-checkout] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
