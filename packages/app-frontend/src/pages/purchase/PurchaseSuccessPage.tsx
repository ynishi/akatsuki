/**
 * Purchase Success Page
 *
 * Displayed after successful Stripe Checkout
 */

import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

export function PurchaseSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Optionally: Verify the session with backend
    // and show order details
    console.log('[PurchaseSuccess] Session ID:', sessionId)
  }, [sessionId])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">🎉</div>
          <CardTitle className="text-2xl">Purchase Complete!</CardTitle>
          <CardDescription>
            Thank you for your purchase. Your tokens have been added to your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-green-50 text-green-700 p-4 rounded-lg">
            <p className="font-medium">Your purchase was successful!</p>
            <p className="text-sm mt-1">
              The tokens are now available in your account.
            </p>
          </div>

          {sessionId && (
            <p className="text-xs text-muted-foreground">
              Session: {sessionId.slice(0, 20)}...
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Link to="/dashboard" className="w-full">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
          <Link to="/shop" className="w-full">
            <Button variant="outline" className="w-full">
              Buy More Tokens
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
