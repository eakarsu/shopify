import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireOrderActor } from "@/lib/order/access"
import { orderErrorResponse, requireIdempotencyKey } from "@/lib/order/http"
import { providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

export async function POST(request: NextRequest) {
  try {
    const actor = requireOrderActor(await getServerSession(authOptions))
    const idempotencyKey = requireIdempotencyKey(request)
    const body = await request.json()
    const quote = await new OrderOperationsService(prisma, providersFromEnvironment()).quoteCheckout(
      { ...body, idempotencyKey },
      actor,
    )
    return NextResponse.json({
      id: quote.id,
      currency: quote.currency,
      subtotal: quote.subtotalPrice.toString(),
      tax: quote.totalTax.toString(),
      shipping: quote.totalShipping.toString(),
      total: quote.totalPrice.toString(),
      shippingService: quote.shippingService,
      expiresAt: quote.expiresAt,
    })
  } catch (error) {
    return orderErrorResponse(error)
  }
}
