import { redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Heart, MapPin, Settings, LogOut, ArrowRight } from "lucide-react"

async function getCustomerData(customerId: string) {
  const [customer, recentOrders] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: true
      }
    }),
    prisma.order.findMany({
      where: { customerId },
      take: 3,
      orderBy: { createdAt: "desc" }
    })
  ])

  return { customer, recentOrders }
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user as any)?.type !== "customer") {
    redirect("/login?callbackUrl=/account")
  }

  const customerId = (session.user as any).customerId
  const { customer, recentOrders } = await getCustomerData(customerId)

  if (!customer) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-muted-foreground mb-8">
          Welcome back, {customer.firstName}!
        </p>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{customer.totalOrders}</div>
              <p className="text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{formatCurrency(customer.totalSpent)}</div>
              <p className="text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{customer.addresses.length}</div>
              <p className="text-muted-foreground">Saved Addresses</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link href="/account/orders">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Order History</h3>
                  <p className="text-sm text-muted-foreground">View and track your orders</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/wishlist">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Wishlist</h3>
                  <p className="text-sm text-muted-foreground">View saved items</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/addresses">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Addresses</h3>
                  <p className="text-sm text-muted-foreground">Manage shipping addresses</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Account Settings</h3>
                  <p className="text-sm text-muted-foreground">Update your profile</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/account/orders">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">Order #{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.totalPrice)}</p>
                      <Badge
                        variant="secondary"
                        className={
                          order.fulfillmentStatus === "FULFILLED"
                            ? "bg-green-100 text-green-800"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {order.fulfillmentStatus.toLowerCase().replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No orders yet. Start shopping!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
