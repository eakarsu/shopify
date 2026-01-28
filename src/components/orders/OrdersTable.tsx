"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils"
import { ShoppingCart } from "lucide-react"

interface Order {
  id: string
  orderNumber: number
  email: string
  status: string
  financialStatus: string
  fulfillmentStatus: string
  totalPrice: any
  createdAt: Date
  customer: {
    firstName: string
    lastName: string
    email: string
  } | null
  items: { quantity: number }[]
}

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter()

  const getTotalItems = (items: { quantity: number }[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No orders found</h3>
        <p className="text-sm text-muted-foreground">Orders will appear here when customers make purchases.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Fulfillment</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer"
              onClick={() => router.push(`/orders/${order.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox />
              </TableCell>
              <TableCell>
                <span className="font-medium">#{order.orderNumber}</span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(order.createdAt)}
              </TableCell>
              <TableCell>
                {order.customer ? (
                  <div>
                    <p className="font-medium">
                      {order.customer.firstName} {order.customer.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{order.email}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.financialStatus)} variant="secondary">
                  {order.financialStatus.toLowerCase().replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.fulfillmentStatus)} variant="secondary">
                  {order.fulfillmentStatus.toLowerCase().replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>{getTotalItems(order.items)} items</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(order.totalPrice)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
