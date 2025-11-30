/**
 * useStripeCheckout Hook
 *
 * Manages Stripe Checkout flow
 */

import { useMutation } from '@tanstack/react-query'
import { StripeCheckoutService, CheckoutRequest } from '../services/StripeCheckoutService'

interface UseStripeCheckoutReturn {
  /** Start checkout flow (creates session and redirects) */
  checkout: (request: CheckoutRequest) => void
  /** Start checkout flow (async version) */
  checkoutAsync: (request: CheckoutRequest) => Promise<void>
  /** Create checkout session without redirecting */
  createSession: (request: CheckoutRequest) => void
  /** Create checkout session without redirecting (async version) */
  createSessionAsync: (request: CheckoutRequest) => Promise<{
    checkoutUrl: string
    sessionId: string
    orderId: string
  }>
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
}

export function useStripeCheckout(): UseStripeCheckoutReturn {
  /**
   * Mutation: Create checkout session and redirect
   */
  const checkoutMutation = useMutation({
    mutationFn: async (request: CheckoutRequest) => {
      await StripeCheckoutService.redirectToCheckout(request)
    },
  })

  /**
   * Mutation: Create checkout session only
   */
  const createSessionMutation = useMutation({
    mutationFn: async (request: CheckoutRequest) => {
      const result = await StripeCheckoutService.createCheckoutSession(request)
      if (result.error) throw result.error
      if (!result.data) throw new Error('Failed to create checkout session')
      return result.data
    },
  })

  return {
    checkout: (request) => checkoutMutation.mutate(request),
    checkoutAsync: (request) => checkoutMutation.mutateAsync(request),
    createSession: (request) => createSessionMutation.mutate(request),
    createSessionAsync: (request) => createSessionMutation.mutateAsync(request),
    isLoading: checkoutMutation.isPending || createSessionMutation.isPending,
    error: checkoutMutation.error || createSessionMutation.error,
  }
}
