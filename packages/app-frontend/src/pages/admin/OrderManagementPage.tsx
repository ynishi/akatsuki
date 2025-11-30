/**
 * Order Management Page
 *
 * Admin page for viewing and managing orders
 */

import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { useOrders } from '../../hooks/useOrders'
import { useOrderItems } from '../../hooks/useOrderItems'
import { useFulfillments } from '../../hooks/useFulfillments'
import { useAuth } from '../../contexts/AuthContext'
import { Order, OrderStatus } from '../../models/Order'
import { OrderItem } from '../../models/OrderItem'
import { Fulfillment } from '../../models/Fulfillment'

export function OrderManagementPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Hooks
  const {
    orders,
    isLoading: ordersLoading,
    refetch: refetchOrders,
    updateOrder,
    isUpdating,
  } = useOrders({ mine: false, limit: 100 })

  const {
    orderitems,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useOrderItems({ mine: false, limit: 500 })

  const {
    fulfillments,
    isLoading: fulfillmentsLoading,
    refetch: refetchFulfillments,
  } = useFulfillments({ mine: false, limit: 500 })

  const isLoading = ordersLoading || itemsLoading || fulfillmentsLoading

  // Get items for an order
  const getItemsForOrder = (orderId: string): OrderItem[] => {
    return (orderitems || []).filter((item) => item.orderId === orderId)
  }

  // Get fulfillments for an order item
  const getFulfillmentsForItem = (orderItemId: string): Fulfillment[] => {
    return (fulfillments || []).filter((f) => f.orderItemId === orderItemId)
  }

  // Filter orders
  const filteredOrders = (orders || []).filter((order) => {
    const matchesSearch =
      !searchQuery ||
      (order.id && order.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.userId && order.userId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.stripeCheckoutSessionId && order.stripeCheckoutSessionId.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort orders by creation date (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })

  // Stats
  const stats = {
    totalOrders: (orders || []).length,
    pendingOrders: (orders || []).filter((o) => o.status === 'pending').length,
    paidOrders: (orders || []).filter((o) => o.status === 'paid').length,
    fulfilledOrders: (orders || []).filter((o) => o.status === 'fulfilled').length,
    totalRevenue: (orders || [])
      .filter((o) => o.status === 'paid' || o.status === 'fulfilled')
      .reduce((sum, o) => sum + o.totalAmount, 0),
  }

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'jpy') {
      return `¥${amount.toLocaleString()}`
    }
    return `$${(amount / 100).toFixed(2)}`
  }

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get status badge variant
  const getStatusBadge = (status: OrderStatus) => {
    const variants: Record<OrderStatus, any> = {
      pending: 'secondary',
      paid: 'default',
      fulfilled: 'outline',
      cancelled: 'destructive',
      refunded: 'destructive',
    }
    return variants[status] || 'outline'
  }

  // Get fulfillment status badge
  const getFulfillmentBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      completed: 'default',
      failed: 'destructive',
    }
    return variants[status] || 'outline'
  }

  // Handle status change
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (!confirm(`Change order status to "${newStatus}"?`)) return
    updateOrder(orderId, { status: newStatus })
  }

  // Handle view details
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  // Refresh all data
  const handleRefresh = () => {
    refetchOrders()
    refetchItems()
    refetchFulfillments()
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
            Order Management
          </h1>
          <p className="text-gray-600 mt-2">View and manage customer orders</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-gray-600">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            <p className="text-xs text-gray-600">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.paidOrders}</div>
            <p className="text-xs text-gray-600">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.fulfilledOrders}</div>
            <p className="text-xs text-gray-600">Fulfilled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              ¥{stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search by order ID, user ID, or session ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({sortedOrders.length})</CardTitle>
          <CardDescription>Click on an order to expand and view items</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No orders found</div>
          ) : (
            <div className="space-y-4">
              {sortedOrders.map((order) => {
                const items = getItemsForOrder(order.id!)
                const isExpanded = expandedOrderId === order.id

                return (
                  <div key={order.id} className="border rounded-lg overflow-hidden">
                    {/* Order Row */}
                    <div
                      className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                          <span className="font-mono text-sm">{order.id?.slice(0, 8)}...</span>
                          <Badge variant={getStatusBadge(order.status)}>{order.status}</Badge>
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(order.totalAmount, order.currency)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 ml-6">
                          User: {order.userId?.slice(0, 8) || 'N/A'} • {formatDate(order.createdAt)}
                          {items.length > 0 && ` • ${items.length} item(s)`}
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={order.status}
                          onValueChange={(val) => handleStatusChange(order.id!, val as OrderStatus)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="fulfilled">Fulfilled</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => handleViewDetails(order)}>
                          Details
                        </Button>
                      </div>
                    </div>

                    {/* Order Items Section */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        <h4 className="font-medium mb-3">Order Items</h4>
                        {items.length === 0 ? (
                          <p className="text-sm text-gray-500">No items in this order.</p>
                        ) : (
                          <div className="space-y-3">
                            {items.map((item) => {
                              const itemFulfillments = getFulfillmentsForItem(item.id!)
                              return (
                                <div key={item.id} className="bg-white rounded border p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.productName}</span>
                                        {item.variantName && (
                                          <span className="text-sm text-gray-500">({item.variantName})</span>
                                        )}
                                        <Badge variant="outline">{item.productType}</Badge>
                                      </div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        Qty: {item.quantity} × {formatPrice(item.unitPrice, order.currency)} ={' '}
                                        <span className="font-medium">{formatPrice(item.subtotal, order.currency)}</span>
                                      </div>
                                      {item.productMetadata && Object.keys(item.productMetadata).length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Metadata: {JSON.stringify(item.productMetadata)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Fulfillments */}
                                  {itemFulfillments.length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                      <div className="text-xs font-medium text-gray-500 mb-1">Fulfillments:</div>
                                      <div className="space-y-1">
                                        {itemFulfillments.map((f) => (
                                          <div key={f.id} className="flex items-center gap-2 text-xs">
                                            <Badge variant={getFulfillmentBadge(f.status)} className="text-xs">
                                              {f.status}
                                            </Badge>
                                            <span className="text-gray-600">{f.fulfillmentType}</span>
                                            {f.completedAt && (
                                              <span className="text-gray-400">at {formatDate(f.completedAt)}</span>
                                            )}
                                            {f.errorMessage && (
                                              <span className="text-red-500">Error: {f.errorMessage}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
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

      {/* Order Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Full order information</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Order ID</label>
                  <p className="font-mono text-sm break-all">{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p>
                    <Badge variant={getStatusBadge(selectedOrder.status)}>{selectedOrder.status}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="font-mono text-sm break-all">{selectedOrder.userId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Amount</label>
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(selectedOrder.totalAmount, selectedOrder.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-sm">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fulfilled At</label>
                  <p className="text-sm">{formatDate(selectedOrder.fulfilledAt)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Stripe Checkout Session</label>
                  <p className="font-mono text-xs break-all">
                    {selectedOrder.stripeCheckoutSessionId || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Stripe Payment Intent</label>
                  <p className="font-mono text-xs break-all">
                    {selectedOrder.stripePaymentIntentId || 'N/A'}
                  </p>
                </div>
                {selectedOrder.metadata && Object.keys(selectedOrder.metadata).length > 0 && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Metadata</label>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(selectedOrder.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Order Items in Detail View */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Order Items</h4>
                {getItemsForOrder(selectedOrder.id!).length === 0 ? (
                  <p className="text-sm text-gray-500">No items</p>
                ) : (
                  <div className="space-y-2">
                    {getItemsForOrder(selectedOrder.id!).map((item) => (
                      <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{item.productName}</span>
                          {item.variantName && (
                            <span className="text-sm text-gray-500"> ({item.variantName})</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">
                            {item.quantity} × {formatPrice(item.unitPrice, selectedOrder.currency)}
                          </span>
                          <span className="font-medium ml-2">
                            {formatPrice(item.subtotal, selectedOrder.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
