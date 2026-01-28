import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey, hasPermission } from "@/lib/api-auth"

// GET /api/v1/orders - List orders
export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "orders:read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 250)
    const cursor = searchParams.get("cursor")
    const status = searchParams.get("status")
    const financialStatus = searchParams.get("financial_status")
    const fulfillmentStatus = searchParams.get("fulfillment_status")
    const customerId = searchParams.get("customer_id")
    const createdAtMin = searchParams.get("created_at_min")
    const createdAtMax = searchParams.get("created_at_max")

    const where: any = {}
    if (status) where.status = status
    if (financialStatus) where.financialStatus = financialStatus
    if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus
    if (customerId) where.customerId = customerId
    if (createdAtMin) where.createdAt = { ...where.createdAt, gte: new Date(createdAtMin) }
    if (createdAtMax) where.createdAt = { ...where.createdAt, lte: new Date(createdAtMax) }

    const orders = await prisma.order.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, handle: true } },
            variant: { select: { id: true, title: true, sku: true } }
          }
        },
        customer: { select: { id: true, email: true, firstName: true, lastName: true } },
        fulfillments: true
      }
    })

    const hasMore = orders.length > limit
    const items = hasMore ? orders.slice(0, -1) : orders
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      orders: items,
      pagination: {
        hasMore,
        cursor: nextCursor
      }
    })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/v1/orders - Create order
export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "orders:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const {
      customerId,
      email,
      items,
      shippingAddress,
      billingAddress,
      shippingAmount,
      taxAmount,
      discountAmount,
      note
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 })
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const variant = await prisma.variant.findUnique({
        where: { id: item.variantId },
        include: { product: true }
      })

      if (!variant) {
        return NextResponse.json({ error: `Variant ${item.variantId} not found` }, { status: 400 })
      }

      const price = Number(variant.price)
      subtotal += price * item.quantity

      orderItems.push({
        productId: variant.productId,
        variantId: variant.id,
        title: variant.product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        quantity: item.quantity,
        price
      })
    }

    const total = subtotal + (shippingAmount || 0) + (taxAmount || 0) - (discountAmount || 0)

    // Generate order number
    const orderCount = await prisma.order.count()
    const orderNumber = `#${(1000 + orderCount + 1).toString()}`

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        email,
        subtotalPrice: subtotal,
        totalShipping: shippingAmount || 0,
        totalTax: taxAmount || 0,
        totalDiscount: discountAmount || 0,
        totalPrice: total,
        shippingAddress,
        billingAddress,
        note,
        status: "OPEN",
        financialStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        items: {
          create: orderItems
        }
      },
      include: {
        items: true,
        customer: true
      }
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
