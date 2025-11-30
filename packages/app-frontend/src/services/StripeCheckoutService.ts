/**
 * Stripe Checkout Service
 *
 * Handles Stripe Checkout session creation and redirect
 */

import { supabase } from '../lib/supabase'

export interface CheckoutRequest {
  variantId: string
  quantity?: number
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutResponse {
  checkoutUrl: string
  sessionId: string
  orderId: string
}

export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

/**
 * Stripe Checkout Service
 */
export class StripeCheckoutService {
  /**
   * Create a Stripe Checkout Session and return the checkout URL
   */
  static async createCheckoutSession(
    request: CheckoutRequest
  ): Promise<ServiceResponse<CheckoutResponse>> {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          variant_id: request.variantId,
          quantity: request.quantity || 1,
          success_url: request.successUrl,
          cancel_url: request.cancelUrl,
        },
      })

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      if (!data?.checkout_url) {
        return { data: null, error: new Error('No checkout URL returned') }
      }

      return {
        data: {
          checkoutUrl: data.checkout_url,
          sessionId: data.session_id,
          orderId: data.order_id,
        },
        error: null,
      }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  /**
   * Redirect to Stripe Checkout
   */
  static async redirectToCheckout(request: CheckoutRequest): Promise<void> {
    const result = await this.createCheckoutSession(request)

    if (result.error) {
      throw result.error
    }

    if (result.data?.checkoutUrl) {
      window.location.href = result.data.checkoutUrl
    }
  }
}
