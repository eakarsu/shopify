import { redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, ArrowRight } from "lucide-react"

async function getOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })
}

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user as any)?.type !== "customer") {
    redirect("/login?callbackUrl=/account/orders")
  }

  const customerId = (session.user as any).customerId
  const orders = await getOrders(customerId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/account">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Account
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-8">Order History</h1>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        Order #{order.orderNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Placed on {order.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          order.financialStatus === "PAID"
                            ? "bg-green-100 text-green-800"
                            : order.financialStatus === "REFUNDED"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {order.financialStatus.toLowerCase()}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          order.fulfillmentStatus === "FULFILLED"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {order.fulfillmentStatus.toLowerCase().replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Items preview */}
                    <div className="flex flex-wrap gap-4">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden">
                            {item.product?.images[0] ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="flex items-center text-muted-foreground text-sm">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>

                    {/* Total and View link */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="font-semibold">
                        Total: {formatCurrency(order.totalPrice)}
                      </span>
                      <Link href={`/account/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">
                When you place an order, it will appear here.
              </p>
              <Link href="/shop">
                <Button>Start Shopping</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
