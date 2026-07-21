import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hasPermission, validateApiKey } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (!hasPermission(auth.apiKey, "orders:read")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 250)
  const orders = await prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { id: true, title: true, slug: true, images: true } } } } },
  })
  return NextResponse.json({ orders })
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (!hasPermission(auth.apiKey, "orders:write")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  return NextResponse.json({
    error: "Direct order creation is disabled; use /api/order-operations/quote and /api/order-operations/checkout",
    code: "UNSAFE_ORDER_PATH_DISABLED",
  }, { status: 410 })
}
