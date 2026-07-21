import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hasPermission, validateApiKey } from "@/lib/api-auth"

async function authorize(request: NextRequest, permission: string) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (!hasPermission(auth.apiKey, permission)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  return null
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await authorize(request, "orders:read")
  if (denied) return denied
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { select: { id: true, title: true, slug: true, images: true } }, variant: true } },
      customer: true,
      fulfillments: { include: { items: true } },
      refunds: true,
      audits: { orderBy: { sequence: "asc" } },
    },
  })
  return order ? NextResponse.json({ order }) : NextResponse.json({ error: "Order not found" }, { status: 404 })
}

export async function PUT(request: NextRequest) {
  const denied = await authorize(request, "orders:write")
  if (denied) return denied
  return NextResponse.json({ error: "Use the idempotent order command endpoint", code: "UNSAFE_ORDER_PATH_DISABLED" }, { status: 410 })
}

export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, "orders:write")
  if (denied) return denied
  return NextResponse.json({ error: "Use the cancel order command", code: "UNSAFE_ORDER_PATH_DISABLED" }, { status: 410 })
}
