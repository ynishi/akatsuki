/**
 * Purchase Cancel Page
 *
 * Displayed when user cancels Stripe Checkout
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

export function PurchaseCancelPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">😢</div>
          <CardTitle className="text-2xl">Purchase Cancelled</CardTitle>
          <CardDescription>
            Your purchase was cancelled. No charges were made.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg">
            <p className="font-medium">Need help?</p>
            <p className="text-sm mt-1">
              If you encountered any issues, please contact support.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Link to="/shop" className="w-full">
            <Button className="w-full">Try Again</Button>
          </Link>
          <Link to="/" className="w-full">
            <Button variant="outline" className="w-full">
              Go Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
