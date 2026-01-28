import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { OrdersTable } from "@/components/orders/OrdersTable"
import { PageHeader } from "@/components/layout/PageHeader"
import { OrderFilters } from "@/components/orders/OrderFilters"

interface OrdersPageProps {
  searchParams: { status?: string; financial?: string; fulfillment?: string; search?: string }
}

async function getOrders(searchParams: OrdersPageProps["searchParams"]) {
  const where: any = {}

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status.toUpperCase()
  }

  if (searchParams.financial && searchParams.financial !== "all") {
    where.financialStatus = searchParams.financial.toUpperCase()
  }

  if (searchParams.fulfillment && searchParams.fulfillment !== "all") {
    where.fulfillmentStatus = searchParams.fulfillment.toUpperCase()
  }

  if (searchParams.search) {
    where.OR = [
      { email: { contains: searchParams.search, mode: "insensitive" } },
      { orderNumber: { equals: parseInt(searchParams.search) || -1 } },
    ]
  }

  return db.order.findMany({
    where,
    include: {
      customer: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50
  })
}

async function getOrderStats() {
  const [total, unfulfilled, paid, pending] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { fulfillmentStatus: "UNFULFILLED" } }),
    db.order.count({ where: { financialStatus: "PAID" } }),
    db.order.count({ where: { financialStatus: "PENDING" } })
  ])
  return { total, unfulfilled, paid, pending }
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const [orders, stats] = await Promise.all([
    getOrders(searchParams),
    getOrderStats()
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description={`${stats.total} orders in your store`}
        action={{ label: "Create order", href: "/orders/new" }}
      />

      <OrderFilters stats={stats} searchParams={searchParams} />

      <OrdersTable orders={serialize(orders)} />
    </div>
  )
}
