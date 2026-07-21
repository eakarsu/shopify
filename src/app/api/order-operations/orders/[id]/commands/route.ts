import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireOrderActor } from "@/lib/order/access"
import { OrderDomainError } from "@/lib/order/domain"
import { orderErrorResponse, requireIdempotencyKey } from "@/lib/order/http"
import { providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const actor = requireOrderActor(await getServerSession(authOptions))
    const idempotencyKey = requireIdempotencyKey(request)
    const body = await request.json()
    const service = new OrderOperationsService(prisma, providersFromEnvironment())
    let result: unknown
    switch (body.command) {
      case "cancel":
        result = await service.cancelOrder(params.id, idempotencyKey, actor)
        break
      case "recover":
        result = await service.recoverOrder(params.id, idempotencyKey, actor)
        break
      case "fulfill":
        result = await service.createFulfillment({
          orderId: params.id,
          idempotencyKey,
          items: body.items,
        }, actor)
        break
      case "refund":
        result = await service.refundOrder(params.id, body.amountCents, body.reason, idempotencyKey, actor)
        break
      case "reconcile":
        result = await service.reconcileOrder(params.id, idempotencyKey, actor)
        break
      default:
        throw new OrderDomainError("Unknown order command", "UNKNOWN_ORDER_COMMAND", 400)
    }
    return NextResponse.json(result)
  } catch (error) {
    return orderErrorResponse(error)
  }
}
