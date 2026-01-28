import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react"
import { SalesChart } from "@/components/analytics/SalesChart"
import { TopProductsChart } from "@/components/analytics/TopProductsChart"
import { CustomerChart } from "@/components/analytics/CustomerChart"

async function getAnalyticsData() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const [
    currentPeriodOrders,
    previousPeriodOrders,
    currentPeriodCustomers,
    previousPeriodCustomers
  ] = await Promise.all([
    db.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        financialStatus: "PAID"
      },
      select: { totalPrice: true, createdAt: true }
    }),
    db.order.findMany({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        financialStatus: "PAID"
      },
      select: { totalPrice: true }
    }),
    db.customer.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.customer.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } })
  ])

  const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0)
  const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0)
  const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

  const currentOrderCount = currentPeriodOrders.length
  const previousOrderCount = previousPeriodOrders.length
  const orderChange = previousOrderCount > 0 ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 0

  const customerChange = previousPeriodCustomers > 0
    ? ((currentPeriodCustomers - previousPeriodCustomers) / previousPeriodCustomers) * 100
    : 0

  const avgOrderValue = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0
  const prevAvgOrderValue = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0
  const aovChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0

  const salesByDate: Record<string, number> = {}
  currentPeriodOrders.forEach(order => {
    const date = order.createdAt.toISOString().split("T")[0]
    salesByDate[date] = (salesByDate[date] || 0) + Number(order.totalPrice)
  })

  const salesData = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    salesData.push({ date: dateStr, sales: salesByDate[dateStr] || 0 })
  }

  return {
    revenue: { current: currentRevenue, change: revenueChange },
    orders: { current: currentOrderCount, change: orderChange },
    customers: { current: currentPeriodCustomers, change: customerChange },
    avgOrderValue: { current: avgOrderValue, change: aovChange },
    salesData
  }
}

async function getTopProducts() {
  const topItems = await db.orderItem.groupBy({
    by: ["productId"],
    _sum: { totalPrice: true, quantity: true },
    orderBy: { _sum: { totalPrice: "desc" } },
    take: 10,
    where: { productId: { not: null } }
  })

  const productIds = topItems.map(item => item.productId).filter(Boolean) as string[]
  const products = await db.product.findMany({
    where: { id: { in: productIds } }
  })

  return topItems.map(item => {
    const product = products.find(p => p.id === item.productId)
    return {
      name: product?.title || "Unknown",
      sales: Number(item._sum.totalPrice || 0),
      quantity: item._sum.quantity || 0
    }
  })
}

async function getCustomerData() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const customers = await db.customer.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true }
  })

  const dataByDate: Record<string, number> = {}
  customers.forEach(c => {
    const date = c.createdAt.toISOString().split("T")[0]
    dataByDate[date] = (dataByDate[date] || 0) + 1
  })

  const result = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    result.push({ date: dateStr, customers: dataByDate[dateStr] || 0 })
  }

  return result
}

export default async function AnalyticsPage() {
  const [analytics, topProducts, customerData] = await Promise.all([
    getAnalyticsData(),
    getTopProducts(),
    getCustomerData()
  ])

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(analytics.revenue.current),
      change: analytics.revenue.change,
      icon: DollarSign
    },
    {
      title: "Total Orders",
      value: formatNumber(analytics.orders.current),
      change: analytics.orders.change,
      icon: ShoppingCart
    },
    {
      title: "New Customers",
      value: formatNumber(analytics.customers.current),
      change: analytics.customers.change,
      icon: Users
    },
    {
      title: "Avg. Order Value",
      value: formatCurrency(analytics.avgOrderValue.current),
      change: analytics.avgOrderValue.change,
      icon: Package
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Store performance over the last 30 days</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs flex items-center gap-1 ${stat.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stat.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(stat.change).toFixed(1)}% vs previous period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesChart data={analytics.salesData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <TopProductsChart products={topProducts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>New Customers Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerChart data={customerData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
