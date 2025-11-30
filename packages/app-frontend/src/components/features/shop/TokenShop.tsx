/**
 * Token Shop Component
 *
 * Displays LLM Token Packs for purchase
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { useProducts } from '../../../hooks/useProducts'
import { useProductVariants } from '../../../hooks/useProductVariants'
import { useStripeCheckout } from '../../../hooks/useStripeCheckout'
import { ProductVariant } from '../../../models/ProductVariant'

interface TokenShopProps {
  /** Show only token packs (default: true) */
  tokenPacksOnly?: boolean
}

export function TokenShop({ tokenPacksOnly = true }: TokenShopProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)

  const { products, isLoading: productsLoading } = useProducts({
    active: true,
    productType: tokenPacksOnly ? 'token_pack' : undefined,
    mine: false,
  })

  const { productvariants, isLoading: variantsLoading } = useProductVariants({
    mine: false,
  })

  const { checkout, isLoading: checkoutLoading, error: checkoutError } = useStripeCheckout()

  const isLoading = productsLoading || variantsLoading

  // Group variants by product
  const getVariantsForProduct = (productId: string): ProductVariant[] => {
    return (productvariants || [])
      .filter((v) => v.productId === productId && v.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  }

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'jpy') {
      return `¥${amount.toLocaleString()}`
    }
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
  }

  // Handle purchase
  const handlePurchase = (variantId: string) => {
    setSelectedVariantId(variantId)
    checkout({ variantId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No products available at the moment.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {checkoutError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Error: {checkoutError.message}
        </div>
      )}

      {products.map((product) => {
        const variants = getVariantsForProduct(product.id!)

        return (
          <Card key={product.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🎫</span>
                    {product.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {product.description}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{product.productType}</Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {variants.length === 0 ? (
                <p className="text-muted-foreground">No pricing options available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {variants.map((variant) => {
                    const tokenAmount = variant.metadata?.token_amount || 0
                    const isSelected = selectedVariantId === variant.id
                    const isProcessing = isSelected && checkoutLoading

                    return (
                      <Card
                        key={variant.id}
                        className={`relative transition-all hover:shadow-lg ${
                          variant.isDefault ? 'border-primary border-2' : ''
                        }`}
                      >
                        {variant.isDefault && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary">Popular</Badge>
                          </div>
                        )}

                        <CardHeader className="text-center pb-2">
                          <CardTitle className="text-lg">{variant.name}</CardTitle>
                          <div className="text-3xl font-bold text-primary">
                            {formatPrice(variant.priceAmount, variant.currency)}
                          </div>
                        </CardHeader>

                        <CardContent className="text-center pb-2">
                          <div className="text-4xl font-bold mb-2">
                            {tokenAmount.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tokens
                          </div>
                          {tokenAmount > 100 && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                {Math.round((1 - (variant.priceAmount / (tokenAmount * 5))) * 100)}% OFF
                              </Badge>
                            </div>
                          )}
                        </CardContent>

                        <CardFooter>
                          <Button
                            className="w-full"
                            size="lg"
                            onClick={() => handlePurchase(variant.id!)}
                            disabled={checkoutLoading}
                          >
                            {isProcessing ? (
                              <>
                                <span className="animate-spin mr-2">⏳</span>
                                Processing...
                              </>
                            ) : (
                              'Purchase'
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
