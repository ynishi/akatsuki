/**
 * Shop Page
 *
 * Main page for purchasing tokens and products
 */

import { TokenShop } from '../../components/features/shop/TokenShop'

export function ShopPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Token Shop</h1>
        <p className="text-muted-foreground">
          Purchase tokens to use with AI features like chat, image generation, and more.
        </p>
      </div>

      <TokenShop />

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Select a token pack that fits your needs</li>
          <li>Complete payment securely via Stripe</li>
          <li>Tokens are instantly added to your account</li>
          <li>Use tokens for AI chat, image generation, and more</li>
        </ul>
      </div>
    </div>
  )
}
