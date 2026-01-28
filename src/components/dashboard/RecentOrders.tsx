"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils"

interface Order {
  id: string
  orderNumber: number
  email: string
  totalPrice: any
  financialStatus: string
  fulfillmentStatus: string
  createdAt: Date
  customer: {
    firstName: string
    lastName: string
  } | null
}

interface RecentOrdersProps {
  orders: Order[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const router = useRouter()

  if (orders.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No recent orders
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          onClick={() => router.push(`/orders/${order.id}`)}
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">#{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground">
              {order.customer
                ? `${order.customer.firstName} ${order.customer.lastName}`
                : order.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm font-medium">{formatCurrency(order.totalPrice)}</p>
            <div className="flex gap-1">
              <Badge className={getStatusColor(order.financialStatus)} variant="secondary">
                {order.financialStatus.toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
