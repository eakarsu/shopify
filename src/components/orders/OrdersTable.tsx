"use client"

import { useState } from "react"
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
import { ShoppingCart, Archive, Trash2, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { bulkUpdateOrderStatus, bulkUpdateOrderFulfillment, bulkDeleteOrders } from "@/lib/actions/bulk"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const getTotalItems = (items: { quantity: number }[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.length === orders.length ? [] : orders.map(o => o.id)
    )
  }

  const handleBulkStatusUpdate = async (status: "OPEN" | "ARCHIVED" | "CANCELLED") => {
    try {
      await bulkUpdateOrderStatus(selectedIds, status)
      toast({ title: "Orders updated", description: `${selectedIds.length} orders set to ${status.toLowerCase()}`, variant: "success" })
      setSelectedIds([])
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to update orders", variant: "destructive" })
    }
  }

  const handleBulkFulfillment = async (status: "UNFULFILLED" | "FULFILLED") => {
    try {
      await bulkUpdateOrderFulfillment(selectedIds, status)
      toast({ title: "Orders updated", description: `${selectedIds.length} orders marked as ${status.toLowerCase()}`, variant: "success" })
      setSelectedIds([])
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to update orders", variant: "destructive" })
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteOrders(selectedIds)
      toast({ title: "Orders deleted", description: `${selectedIds.length} orders deleted`, variant: "success" })
      setSelectedIds([])
      setBulkDeleteOpen(false)
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to delete orders", variant: "destructive" })
    }
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
    <>
      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-blue-50 p-3 mb-4">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-4">
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate("ARCHIVED")}>
              <Archive className="mr-1 h-3 w-3" /> Archive
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkFulfillment("FULFILLED")}>
              <CheckCircle className="mr-1 h-3 w-3" /> Mark Fulfilled
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds([])}>
            <XCircle className="mr-1 h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === orders.length && orders.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
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
                  <Checkbox
                    checked={selectedIds.includes(order.id)}
                    onCheckedChange={() => toggleSelect(order.id)}
                  />
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} orders?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected orders. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedIds.length} orders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
