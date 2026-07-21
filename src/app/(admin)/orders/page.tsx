import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { OrdersPageClient } from "@/components/orders/OrdersPageClient"

interface OrdersPageProps {
  searchParams: Promise<{ status?: string; financial?: string; fulfillment?: string; search?: string }>
}

async function getOrders(searchParams: Awaited<OrdersPageProps["searchParams"]>) {
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

export default async function OrdersPage(props: OrdersPageProps) {
  const searchParams = await props.searchParams;
  const [orders, stats] = await Promise.all([
    getOrders(searchParams),
    getOrderStats()
  ])

  return (
    <OrdersPageClient
      orders={serialize(orders)}
      stats={stats}
      searchParams={searchParams}
    />
  )
}
