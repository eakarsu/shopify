import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { OrderDomainError } from "@/lib/order/domain"
import { orderErrorResponse } from "@/lib/order/http"
import { HttpShippingProvider, providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-provider-signature") ?? ""
    const shipping = new HttpShippingProvider()
    if (!signature || !shipping.verifyWebhook(rawBody, signature)) {
      throw new OrderDomainError("Invalid delivery webhook signature", "INVALID_WEBHOOK_SIGNATURE", 400)
    }
    const body = JSON.parse(rawBody)
    if (!body.id || !body.type || !body.shipmentId || !body.status) {
      throw new OrderDomainError("Malformed delivery webhook", "INVALID_WEBHOOK_PAYLOAD", 400)
    }
    const allowed = ["PENDING", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"]
    if (!allowed.includes(body.status)) {
      throw new OrderDomainError("Unknown delivery status", "INVALID_WEBHOOK_PAYLOAD", 400)
    }
    const result = await new OrderOperationsService(prisma, providersFromEnvironment()).processDeliveryEvent({
      provider: shipping.name,
      eventId: body.id,
      eventType: body.type,
      shipmentId: body.shipmentId,
      status: body.status,
      trackingNumber: body.trackingNumber,
      payload: body,
    })
    return NextResponse.json(result)
  } catch (error) {
    return orderErrorResponse(error)
  }
}
