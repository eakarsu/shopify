"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingBag, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate, formatDateTime, getInitials, getStatusColor } from "@/lib/utils"

interface CustomerDetailProps {
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    company: string | null
    address1: string | null
    address2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    totalOrders: number
    totalSpent: any
    notes: string | null
    tags: string[]
    acceptsMarketing: boolean
    createdAt: Date
    orders: {
      id: string
      orderNumber: number
      financialStatus: string
      fulfillmentStatus: string
      totalPrice: any
      createdAt: Date
      items: { quantity: number }[]
    }[]
  }
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const router = useRouter()

  const fullName = `${customer.firstName} ${customer.lastName}`
  const address = [
    customer.address1,
    customer.address2,
    customer.city,
    customer.state,
    customer.postalCode,
    customer.country
  ].filter(Boolean).join(", ")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/customers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">
              {getInitials(customer.firstName, customer.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-sm text-muted-foreground">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-blue-100 p-2">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{customer.totalOrders}</p>
                  <p className="text-sm text-muted-foreground">Total orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-green-100 p-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(customer.totalSpent)}</p>
                  <p className="text-sm text-muted-foreground">Total spent</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {customer.orders.length > 0
                      ? formatDate(customer.orders[0].createdAt)
                      : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">Last order</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                        <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.financialStatus)} variant="secondary">
                            {order.financialStatus.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.fulfillmentStatus)} variant="secondary">
                            {order.fulfillmentStatus.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(order.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No orders yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.phone}</span>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{address}</span>
                </div>
              )}
              {customer.company && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Company: </span>
                  {customer.company}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${customer.acceptsMarketing ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-sm">
                  {customer.acceptsMarketing
                    ? "Accepts email marketing"
                    : "Does not accept marketing"}
                </span>
              </div>
            </CardContent>
          </Card>

          {customer.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
