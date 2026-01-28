import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey, hasPermission } from "@/lib/api-auth"

// GET /api/v1/orders/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "orders:read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, handle: true, images: true } },
            variant: { select: { id: true, title: true, sku: true } }
          }
        },
        customer: true,
        fulfillments: {
          include: { items: true }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/v1/orders/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "orders:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { status, note, tags, shippingAddress, billingAddress } = body

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(note !== undefined && { note }),
        ...(tags !== undefined && { tags }),
        ...(shippingAddress && { shippingAddress }),
        ...(billingAddress && { billingAddress })
      },
      include: {
        items: true,
        customer: true,
        fulfillments: true
      }
    })

    return NextResponse.json({ order })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/v1/orders/:id - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "orders:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date()
      }
    })

    return NextResponse.json({ order, cancelled: true })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
