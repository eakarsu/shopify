import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { DollarSign, Package, ShoppingCart, Users, Warehouse, Tag, FolderOpen, BarChart3, Settings, Download, FileText, Shield } from "lucide-react"
import Link from "next/link"

async function getStats() {
  const [productsCount, ordersCount, customersCount, totalRevenue, discountsCount, collectionsCount, inventoryCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.order.aggregate({
      _sum: { totalPrice: true }
    }),
    prisma.discount.count(),
    prisma.collection.count(),
    prisma.inventory.aggregate({ _sum: { quantity: true } })
  ])

  return {
    products: productsCount,
    orders: ordersCount,
    customers: customersCount,
    revenue: totalRevenue._sum.totalPrice || 0,
    discounts: discountsCount,
    collections: collectionsCount,
    totalInventory: inventoryCount._sum.quantity || 0
  }
}

async function getRecentOrders() {
  return prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true
    }
  })
}

const featureCards = [
  { title: "Products", description: "Manage your product catalog", href: "/products", icon: Package, color: "bg-blue-500" },
  { title: "Orders", description: "View and manage orders", href: "/orders", icon: ShoppingCart, color: "bg-green-500" },
  { title: "Customers", description: "Customer management", href: "/customers", icon: Users, color: "bg-purple-500" },
  { title: "Inventory", description: "Track stock levels", href: "/inventory", icon: Warehouse, color: "bg-orange-500" },
  { title: "Analytics", description: "Sales and traffic data", href: "/analytics", icon: BarChart3, color: "bg-indigo-500" },
  { title: "Discounts", description: "Manage discount codes", href: "/discounts", icon: Tag, color: "bg-pink-500" },
  { title: "Collections", description: "Organize products", href: "/collections", icon: FolderOpen, color: "bg-teal-500" },
  { title: "Settings", description: "Store configuration", href: "/settings", icon: Settings, color: "bg-gray-500" },
  { title: "CSV Export", description: "Export data to CSV", href: "/export", icon: Download, color: "bg-emerald-500" },
  { title: "PDF Reports", description: "Generate PDF reports", href: "/export", icon: FileText, color: "bg-red-500" },
]

export default async function DashboardPage() {
  const stats = await getStats()
  const recentOrders = await getRecentOrders()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your store admin panel</p>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/orders">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Number(stats.revenue).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From all orders</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/orders">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders}</div>
              <p className="text-xs text-muted-foreground">Total orders placed</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/products">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
              <p className="text-xs text-muted-foreground">Active products</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customers">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customers}</div>
              <p className="text-xs text-muted-foreground">Registered customers</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Feature Navigation Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {featureCards.map((card) => (
            <Link key={card.href + card.title} href={card.href}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`rounded-lg p-2 ${card.color}`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{card.title}</p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders - Clickable rows */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your store</CardDescription>
          </div>
          <Link href="/orders" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium">#{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer?.firstName} {order.customer?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${Number(order.totalPrice).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{order.status}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
