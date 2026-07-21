import { prisma } from "./prisma"

export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "newsletter_signup"

export async function trackEvent(data: {
  type: AnalyticsEventType
  sessionId?: string
  customerId?: string
  productId?: string
  orderId?: string
  data?: any
}) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: data.type,
        sessionId: data.sessionId,
        customerId: data.customerId,
        productId: data.productId,
        orderId: data.orderId,
        data: data.data
      }
    })
  } catch (error) {
    console.error("Failed to track event:", error)
  }
}

export async function getRealtimeStats() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

  const [activeVisitors, recentOrders, recentPageViews] = await Promise.all([
    // Active visitors (unique sessions in last 15 min)
    prisma.analyticsEvent.groupBy({
      by: ["sessionId"],
      where: {
        createdAt: { gte: fifteenMinutesAgo },
        sessionId: { not: null }
      }
    }).then(r => r.length),

    // Recent orders
    prisma.order.count({
      where: { createdAt: { gte: fifteenMinutesAgo } }
    }),

    // Page views in last 15 min
    prisma.analyticsEvent.count({
      where: {
        type: "page_view",
        createdAt: { gte: fifteenMinutesAgo }
      }
    })
  ])

  return {
    activeVisitors,
    recentOrders,
    recentPageViews
  }
}

export async function getDashboardStats(period: "today" | "week" | "month" | "year" = "today") {
  const now = new Date()
  let startDate: Date

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1)
      break
  }

  const [
    totalOrders,
    totalRevenue,
    totalCustomers,
    totalPageViews,
    topProducts,
    recentOrders
  ] = await Promise.all([
    // Total orders
    prisma.order.count({
      where: { createdAt: { gte: startDate } }
    }),

    // Total revenue
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate },
        financialStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] }
      },
      _sum: { totalPrice: true }
    }),

    // New customers
    prisma.customer.count({
      where: { createdAt: { gte: startDate } }
    }),

    // Page views
    prisma.analyticsEvent.count({
      where: {
        type: "page_view",
        createdAt: { gte: startDate }
      }
    }),

    // Top products by views
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: {
        type: "product_view",
        createdAt: { gte: startDate },
        productId: { not: null }
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5
    }),

    // Recent orders
    prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } }
      }
    })
  ])

  // Get product details for top products
  const topProductIds = topProducts.map(p => p.productId).filter(Boolean) as string[]
  const productDetails = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, title: true, images: true }
  })

  const productMap = new Map(productDetails.map(p => [p.id, p]))

  return {
    totalOrders,
    totalRevenue: Number(totalRevenue._sum.totalPrice || 0),
    totalCustomers,
    totalPageViews,
    topProducts: topProducts.map(p => ({
      product: productMap.get(p.productId!),
      views: p._count.productId
    })),
    recentOrders
  }
}

export async function getConversionFunnel(period: "today" | "week" | "month" = "week") {
  const now = new Date()
  let startDate: Date

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
  }

  const [productViews, addToCarts, checkouts, purchases] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { type: "product_view", createdAt: { gte: startDate } }
    }),
    prisma.analyticsEvent.count({
      where: { type: "add_to_cart", createdAt: { gte: startDate } }
    }),
    prisma.analyticsEvent.count({
      where: { type: "begin_checkout", createdAt: { gte: startDate } }
    }),
    prisma.analyticsEvent.count({
      where: { type: "purchase", createdAt: { gte: startDate } }
    })
  ])

  return {
    productViews,
    addToCarts,
    checkouts,
    purchases,
    addToCartRate: productViews > 0 ? ((addToCarts / productViews) * 100).toFixed(1) : "0",
    checkoutRate: addToCarts > 0 ? ((checkouts / addToCarts) * 100).toFixed(1) : "0",
    purchaseRate: checkouts > 0 ? ((purchases / checkouts) * 100).toFixed(1) : "0",
    overallConversion: productViews > 0 ? ((purchases / productViews) * 100).toFixed(2) : "0"
  }
}

export async function getSalesChart(period: "week" | "month" | "year" = "week") {
  const now = new Date()
  let startDate: Date
  let groupBy: "day" | "month"

  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      groupBy = "day"
      break
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      groupBy = "day"
      break
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1)
      groupBy = "month"
      break
  }

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      financialStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] }
    },
    select: {
      createdAt: true,
      totalPrice: true
    }
  })

  // Group by date
  const salesByDate = new Map<string, number>()

  orders.forEach(order => {
    const date = order.createdAt
    let key: string

    if (groupBy === "day") {
      key = date.toISOString().split("T")[0]
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    }

    salesByDate.set(key, (salesByDate.get(key) || 0) + Number(order.totalPrice))
  })

  // Convert to array and sort
  const chartData = Array.from(salesByDate.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return chartData
}

export async function updateDailyAnalytics() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    pageViews,
    uniqueVisitors,
    orders,
    revenue,
    productViews,
    purchases
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { type: "page_view", createdAt: { gte: today, lt: tomorrow } }
    }),
    prisma.analyticsEvent.groupBy({
      by: ["sessionId"],
      where: { createdAt: { gte: today, lt: tomorrow }, sessionId: { not: null } }
    }).then(r => r.length),
    prisma.order.count({
      where: { createdAt: { gte: today, lt: tomorrow } }
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow }, financialStatus: "PAID" },
      _sum: { totalPrice: true }
    }),
    prisma.analyticsEvent.count({
      where: { type: "product_view", createdAt: { gte: today, lt: tomorrow } }
    }),
    prisma.analyticsEvent.count({
      where: { type: "purchase", createdAt: { gte: today, lt: tomorrow } }
    })
  ])

  const conversionRate = productViews > 0 ? (purchases / productViews) * 100 : 0

  // Get top products
  const topProducts = await prisma.analyticsEvent.groupBy({
    by: ["productId"],
    where: { type: "product_view", createdAt: { gte: today, lt: tomorrow }, productId: { not: null } },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: 10
  })

  await prisma.dailyAnalytics.upsert({
    where: { date: today },
    create: {
      date: today,
      pageViews,
      uniqueVisitors,
      orders,
      revenue: Number(revenue._sum.totalPrice || 0),
      conversionRate,
      topProducts: topProducts.map(p => ({ productId: p.productId, views: p._count.productId }))
    },
    update: {
      pageViews,
      uniqueVisitors,
      orders,
      revenue: Number(revenue._sum.totalPrice || 0),
      conversionRate,
      topProducts: topProducts.map(p => ({ productId: p.productId, views: p._count.productId }))
    }
  })
}
