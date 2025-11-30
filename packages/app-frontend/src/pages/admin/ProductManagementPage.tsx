/**
 * Product Management Page
 *
 * Admin page for managing products and variants
 */

import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Switch } from '../../components/ui/switch'
import { useProducts } from '../../hooks/useProducts'
import { useProductVariants } from '../../hooks/useProductVariants'
import { useAuth } from '../../contexts/AuthContext'
import { Product, ProductProductType } from '../../models/Product'
import { ProductVariant } from '../../models/ProductVariant'

interface ProductForm {
  name: string
  description: string
  productType: ProductProductType
  stripeProductId: string
  imageUrl: string
  displayOrder: number
  isActive: boolean
}

interface VariantForm {
  productId: string
  name: string
  priceAmount: number
  currency: string
  stripePriceId: string
  metadata: string // JSON string
  isDefault: boolean
  isActive: boolean
  displayOrder: number
}

const initialProductForm: ProductForm = {
  name: '',
  description: '',
  productType: 'digital',
  stripeProductId: '',
  imageUrl: '',
  displayOrder: 0,
  isActive: true,
}

const initialVariantForm: VariantForm = {
  productId: '',
  name: '',
  priceAmount: 0,
  currency: 'jpy',
  stripePriceId: '',
  metadata: '{}',
  isDefault: false,
  isActive: true,
  displayOrder: 0,
}

export function ProductManagementPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm)
  const [isEditingProduct, setIsEditingProduct] = useState(false)

  // Variant state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [variantForm, setVariantForm] = useState<VariantForm>(initialVariantForm)
  const [isEditingVariant, setIsEditingVariant] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)

  // Hooks
  const {
    products,
    isLoading: productsLoading,
    refetch: refetchProducts,
    createProductAsync,
    updateProductAsync,
    deleteProduct,
    isCreating: isCreatingProduct,
    isUpdating: isUpdatingProduct,
  } = useProducts({ mine: false })

  const {
    productvariants,
    isLoading: variantsLoading,
    refetch: refetchVariants,
    createProductVariantAsync,
    updateProductVariantAsync,
    deleteProductVariant,
    isCreating: isCreatingVariant,
    isUpdating: isUpdatingVariant,
  } = useProductVariants({ mine: false })

  const isLoading = productsLoading || variantsLoading

  // Get variants for a product
  const getVariantsForProduct = (productId: string): ProductVariant[] => {
    return (productvariants || [])
      .filter((v) => v.productId === productId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  }

  // Filter products
  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = typeFilter === 'all' || product.productType === typeFilter
    return matchesSearch && matchesType
  })

  // Stats
  const stats = {
    totalProducts: (products || []).length,
    activeProducts: (products || []).filter((p) => p.isActive).length,
    totalVariants: (productvariants || []).length,
    tokenPacks: (products || []).filter((p) => p.productType === 'token_pack').length,
  }

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'jpy') {
      return `¥${amount.toLocaleString()}`
    }
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
  }

  // Product handlers
  const handleCreateProduct = () => {
    setIsEditingProduct(false)
    setProductForm(initialProductForm)
    setProductDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setIsEditingProduct(true)
    setSelectedProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      productType: product.productType,
      stripeProductId: product.stripeProductId || '',
      imageUrl: product.imageUrl || '',
      displayOrder: product.displayOrder || 0,
      isActive: product.isActive,
    })
    setProductDialogOpen(true)
  }

  const handleSaveProduct = async () => {
    try {
      if (isEditingProduct && selectedProduct?.id) {
        await updateProductAsync(selectedProduct.id, {
          name: productForm.name,
          description: productForm.description || undefined,
          productType: productForm.productType,
          stripeProductId: productForm.stripeProductId || undefined,
          imageUrl: productForm.imageUrl || undefined,
          displayOrder: productForm.displayOrder,
          isActive: productForm.isActive,
        })
      } else {
        await createProductAsync({
          name: productForm.name,
          description: productForm.description || undefined,
          productType: productForm.productType,
          stripeProductId: productForm.stripeProductId || undefined,
          imageUrl: productForm.imageUrl || undefined,
          displayOrder: productForm.displayOrder,
          isActive: productForm.isActive,
        })
      }
      setProductDialogOpen(false)
      refetchProducts()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleDeleteProduct = (product: Product) => {
    if (!confirm(`Delete product "${product.name}"? This will also delete all variants.`)) return
    if (product.id) {
      deleteProduct(product.id)
    }
  }

  // Variant handlers
  const handleCreateVariant = (productId: string) => {
    setIsEditingVariant(false)
    setVariantForm({ ...initialVariantForm, productId })
    setVariantDialogOpen(true)
  }

  const handleEditVariant = (variant: ProductVariant) => {
    setIsEditingVariant(true)
    setSelectedVariant(variant)
    setVariantForm({
      productId: variant.productId,
      name: variant.name,
      priceAmount: variant.priceAmount,
      currency: variant.currency,
      stripePriceId: variant.stripePriceId || '',
      metadata: JSON.stringify(variant.metadata || {}, null, 2),
      isDefault: variant.isDefault,
      isActive: variant.isActive,
      displayOrder: variant.displayOrder || 0,
    })
    setVariantDialogOpen(true)
  }

  const handleSaveVariant = async () => {
    try {
      let metadata: Record<string, any> | undefined
      try {
        metadata = JSON.parse(variantForm.metadata)
      } catch {
        metadata = undefined
      }

      if (isEditingVariant && selectedVariant?.id) {
        await updateProductVariantAsync(selectedVariant.id, {
          productId: variantForm.productId,
          name: variantForm.name,
          priceAmount: variantForm.priceAmount,
          currency: variantForm.currency,
          stripePriceId: variantForm.stripePriceId || undefined,
          metadata,
          isDefault: variantForm.isDefault,
          isActive: variantForm.isActive,
          displayOrder: variantForm.displayOrder,
        })
      } else {
        await createProductVariantAsync({
          productId: variantForm.productId,
          name: variantForm.name,
          priceAmount: variantForm.priceAmount,
          currency: variantForm.currency,
          stripePriceId: variantForm.stripePriceId || undefined,
          metadata,
          isDefault: variantForm.isDefault,
          isActive: variantForm.isActive,
          displayOrder: variantForm.displayOrder,
        })
      }
      setVariantDialogOpen(false)
      refetchVariants()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleDeleteVariant = (variant: ProductVariant) => {
    if (!confirm(`Delete variant "${variant.name}"?`)) return
    if (variant.id) {
      deleteProductVariant(variant.id)
    }
  }

  // Get badge variant for product type
  const getTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      token_pack: 'default',
      digital: 'secondary',
      feature: 'outline',
      physical: 'destructive',
    }
    return variants[type] || 'outline'
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to access the admin panel.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
            Product Management
          </h1>
          <p className="text-gray-600 mt-2">Manage products and pricing variants</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchProducts()
              refetchVariants()
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button variant="gradient" onClick={handleCreateProduct}>
            + New Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-gray-600">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
            <p className="text-xs text-gray-600">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.totalVariants}</div>
            <p className="text-xs text-gray-600">Total Variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.tokenPacks}</div>
            <p className="text-xs text-gray-600">Token Packs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="token_pack">Token Pack</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
          <CardDescription>Click on a product to expand and manage variants</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No products found</div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const variants = getVariantsForProduct(product.id!)
                const isExpanded = expandedProductId === product.id

                return (
                  <div key={product.id} className="border rounded-lg overflow-hidden">
                    {/* Product Row */}
                    <div
                      className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                          <span className="font-semibold">{product.name}</span>
                          <Badge variant={getTypeBadge(product.productType)}>{product.productType}</Badge>
                          {!product.isActive && <Badge variant="destructive">Inactive</Badge>}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 ml-6">
                          {product.description || 'No description'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 ml-6">
                          {variants.length} variant(s) • Order: {product.displayOrder || 0}
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Variants Section */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Pricing Variants</h4>
                          <Button size="sm" onClick={() => handleCreateVariant(product.id!)}>
                            + Add Variant
                          </Button>
                        </div>
                        {variants.length === 0 ? (
                          <p className="text-sm text-gray-500">No variants. Add one to enable purchases.</p>
                        ) : (
                          <div className="space-y-2">
                            {variants.map((variant) => (
                              <div
                                key={variant.id}
                                className="flex items-center justify-between p-3 bg-white rounded border"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{variant.name}</span>
                                    <span className="text-lg font-bold text-primary">
                                      {formatPrice(variant.priceAmount, variant.currency)}
                                    </span>
                                    {variant.isDefault && <Badge>Default</Badge>}
                                    {!variant.isActive && <Badge variant="destructive">Inactive</Badge>}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {variant.metadata?.token_amount && (
                                      <span className="mr-3">Tokens: {variant.metadata.token_amount}</span>
                                    )}
                                    Order: {variant.displayOrder || 0}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleEditVariant(variant)}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteVariant(variant)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
            <DialogDescription>
              {isEditingProduct ? 'Update product details' : 'Add a new product to the catalog'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="mt-1"
                placeholder="Product name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="mt-1"
                placeholder="Product description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Product Type *</label>
              <Select
                value={productForm.productType}
                onValueChange={(val) => setProductForm({ ...productForm, productType: val as ProductProductType })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token_pack">Token Pack (LLM credits)</SelectItem>
                  <SelectItem value="digital">Digital Product</SelectItem>
                  <SelectItem value="feature">Feature Unlock</SelectItem>
                  <SelectItem value="physical">Physical Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Stripe Product ID</label>
              <Input
                value={productForm.stripeProductId}
                onChange={(e) => setProductForm({ ...productForm, stripeProductId: e.target.value })}
                className="mt-1"
                placeholder="prod_xxxxx"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={productForm.imageUrl}
                onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                className="mt-1"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Display Order</label>
              <Input
                type="number"
                value={productForm.displayOrder}
                onChange={(e) => setProductForm({ ...productForm, displayOrder: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={productForm.isActive}
                onCheckedChange={(checked) => setProductForm({ ...productForm, isActive: checked })}
              />
              <label className="text-sm font-medium">Active</label>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleSaveProduct}
                disabled={isCreatingProduct || isUpdatingProduct || !productForm.name}
              >
                {isCreatingProduct || isUpdatingProduct ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditingVariant ? 'Edit Variant' : 'Create Variant'}</DialogTitle>
            <DialogDescription>
              {isEditingVariant ? 'Update pricing variant details' : 'Add a new pricing option'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={variantForm.name}
                onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                className="mt-1"
                placeholder="e.g., Basic Pack, Pro Pack"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Price Amount *</label>
                <Input
                  type="number"
                  value={variantForm.priceAmount}
                  onChange={(e) => setVariantForm({ ...variantForm, priceAmount: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                  placeholder="Amount in smallest unit"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {variantForm.currency === 'jpy' ? 'In yen' : 'In cents (e.g., 999 = $9.99)'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Select
                  value={variantForm.currency}
                  onValueChange={(val) => setVariantForm({ ...variantForm, currency: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpy">JPY (¥)</SelectItem>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Stripe Price ID</label>
              <Input
                value={variantForm.stripePriceId}
                onChange={(e) => setVariantForm({ ...variantForm, stripePriceId: e.target.value })}
                className="mt-1"
                placeholder="price_xxxxx"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Metadata (JSON)</label>
              <textarea
                value={variantForm.metadata}
                onChange={(e) => setVariantForm({ ...variantForm, metadata: e.target.value })}
                className="mt-1 w-full p-2 border rounded-md text-sm font-mono"
                rows={3}
                placeholder='{"token_amount": 100}'
              />
              <p className="text-xs text-gray-500 mt-1">For token_pack: include "token_amount"</p>
            </div>
            <div>
              <label className="text-sm font-medium">Display Order</label>
              <Input
                type="number"
                value={variantForm.displayOrder}
                onChange={(e) => setVariantForm({ ...variantForm, displayOrder: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={variantForm.isDefault}
                  onCheckedChange={(checked) => setVariantForm({ ...variantForm, isDefault: checked })}
                />
                <label className="text-sm font-medium">Default</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={variantForm.isActive}
                  onCheckedChange={(checked) => setVariantForm({ ...variantForm, isActive: checked })}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleSaveVariant}
                disabled={isCreatingVariant || isUpdatingVariant || !variantForm.name || variantForm.priceAmount <= 0}
              >
                {isCreatingVariant || isUpdatingVariant ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
