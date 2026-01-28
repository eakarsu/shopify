"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Printer, MoreHorizontal, CheckCircle, XCircle, Truck, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils"
import { markOrderAsPaid, markOrderAsFulfilled, cancelOrder, refundOrder } from "@/lib/actions/orders"

interface OrderDetailProps {
  order: {
    id: string
    orderNumber: number
    email: string
    phone: string | null
    status: string
    financialStatus: string
    fulfillmentStatus: string
    currency: string
    subtotalPrice: any
    totalTax: any
    totalShipping: any
    totalDiscounts: any
    totalPrice: any
    shippingAddress1: string | null
    shippingAddress2: string | null
    shippingCity: string | null
    shippingState: string | null
    shippingPostalCode: string | null
    shippingCountry: string | null
    billingAddress1: string | null
    billingCity: string | null
    billingState: string | null
    billingPostalCode: string | null
    billingCountry: string | null
    notes: string | null
    discountCode: string | null
    createdAt: Date
    customer: {
      id: string
      firstName: string
      lastName: string
      email: string
      phone: string | null
      totalOrders: number
    } | null
    items: {
      id: string
      productId: string | null
      title: string
      variantTitle: string | null
      sku: string | null
      quantity: number
      price: any
      totalPrice: any
      product: { id: string; images: string[] } | null
    }[]
    timeline: {
      id: string
      type: string
      message: string
      createdAt: Date
    }[]
  }
}

export function OrderDetail({ order }: OrderDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)

  const formatAddress = (
    address1?: string | null,
    address2?: string | null,
    city?: string | null,
    state?: string | null,
    postalCode?: string | null,
    country?: string | null
  ) => {
    const parts = [address1, address2, city, state, postalCode, country].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "No address provided"
  }

  const handleMarkAsPaid = async () => {
    setLoading("paid")
    try {
      await markOrderAsPaid(order.id)
      router.refresh()
    } catch (error) {
      console.error("Failed to mark as paid:", error)
    } finally {
      setLoading(null)
    }
  }

  const handleMarkAsFulfilled = async () => {
    setLoading("fulfilled")
    try {
      await markOrderAsFulfilled(order.id)
      router.refresh()
    } catch (error) {
      console.error("Failed to mark as fulfilled:", error)
    } finally {
      setLoading(null)
    }
  }

  const handleCancelOrder = async () => {
    setLoading("cancel")
    try {
      await cancelOrder(order.id)
      router.refresh()
      setCancelDialogOpen(false)
    } catch (error) {
      console.error("Failed to cancel order:", error)
    } finally {
      setLoading(null)
    }
  }

  const handleRefundOrder = async () => {
    setLoading("refund")
    try {
      await refundOrder(order.id)
      router.refresh()
      setRefundDialogOpen(false)
    } catch (error) {
      console.error("Failed to refund order:", error)
    } finally {
      setLoading(null)
    }
  }

  const canMarkAsPaid = order.financialStatus === "PENDING"
  const canMarkAsFulfilled = order.fulfillmentStatus === "UNFULFILLED" && order.financialStatus === "PAID"
  const canCancel = order.status !== "CANCELLED"
  const canRefund = order.financialStatus === "PAID" && order.status !== "CANCELLED"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">#{order.orderNumber}</h1>
              <Badge className={getStatusColor(order.financialStatus)} variant="secondary">
                {order.financialStatus.toLowerCase().replace("_", " ")}
              </Badge>
              <Badge className={getStatusColor(order.fulfillmentStatus)} variant="secondary">
                {order.fulfillmentStatus.toLowerCase().replace("_", " ")}
              </Badge>
              {order.status === "CANCELLED" && (
                <Badge className="bg-red-100 text-red-800" variant="secondary">
                  cancelled
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Duplicate order</DropdownMenuItem>
              {canRefund && (
                <DropdownMenuItem onClick={() => setRefundDialogOpen(true)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refund order
                </DropdownMenuItem>
              )}
              {canCancel && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel order
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Order Items</CardTitle>
              {canMarkAsFulfilled && (
                <Button size="sm" onClick={handleMarkAsFulfilled} disabled={loading === "fulfilled"}>
                  <Truck className="mr-2 h-4 w-4" />
                  {loading === "fulfilled" ? "Fulfilling..." : "Fulfill items"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.productId && router.push(`/products/${item.productId}`)}
                    className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {item.product?.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.title}
                          className="h-12 w-12 object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      {item.variantTitle && (
                        <p className="text-sm text-muted-foreground">{item.variantTitle}</p>
                      )}
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {formatCurrency(item.price)} x {item.quantity}
                      </p>
                      <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotalPrice)}</span>
                </div>
                {Number(order.totalDiscounts) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount {order.discountCode && `(${order.discountCode})`}</span>
                    <span>-{formatCurrency(order.totalDiscounts)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.totalShipping)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>{formatCurrency(order.totalTax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalPrice)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {order.timeline.length > 0 ? (
                <div className="space-y-4">
                  {order.timeline.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {event.type === "created" && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {event.type === "paid" && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {event.type === "fulfilled" && <Truck className="h-4 w-4 text-blue-600" />}
                        {event.type === "cancelled" && <XCircle className="h-4 w-4 text-red-600" />}
                        {event.type === "refunded" && <RefreshCw className="h-4 w-4 text-orange-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No timeline events</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {canMarkAsPaid && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Payment pending</span>
                </div>
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  onClick={handleMarkAsPaid}
                  disabled={loading === "paid"}
                >
                  {loading === "paid" ? "Processing..." : "Mark as paid"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {order.customer ? (
                <div
                  onClick={() => router.push(`/customers/${order.customer!.id}`)}
                  className="cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded-lg"
                >
                  <p className="font-medium">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                  {order.customer.phone && (
                    <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {order.customer.totalOrders} orders
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">{order.email}</p>
                  {order.phone && <p className="text-sm text-muted-foreground">{order.phone}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {formatAddress(
                  order.shippingAddress1,
                  order.shippingAddress2,
                  order.shippingCity,
                  order.shippingState,
                  order.shippingPostalCode,
                  order.shippingCountry
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {formatAddress(
                  order.billingAddress1,
                  null,
                  order.billingCity,
                  order.billingState,
                  order.billingPostalCode,
                  order.billingCountry
                )}
              </p>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel order #{order.orderNumber}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading === "cancel"}
            >
              {loading === "cancel" ? "Cancelling..." : "Cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will refund {formatCurrency(order.totalPrice)} for order #{order.orderNumber}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefundOrder}
              disabled={loading === "refund"}
            >
              {loading === "refund" ? "Processing..." : "Refund order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
