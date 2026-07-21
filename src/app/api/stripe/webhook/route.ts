import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { OrderDomainError } from "@/lib/order/domain"
import { orderErrorResponse } from "@/lib/order/http"
import { ProviderConfigurationError, providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const missing = [!secretKey && "STRIPE_SECRET_KEY", !webhookSecret && "STRIPE_WEBHOOK_SECRET"].filter(Boolean) as string[]
    if (missing.length) throw new ProviderConfigurationError("stripe", missing)

    const rawBody = await request.text()
    const signature = request.headers.get("stripe-signature")
    if (!signature) throw new OrderDomainError("Missing Stripe signature", "INVALID_WEBHOOK_SIGNATURE", 400)

    const stripe = new Stripe(secretKey!)
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret!)
    } catch {
      throw new OrderDomainError("Invalid Stripe signature", "INVALID_WEBHOOK_SIGNATURE", 400)
    }

    const service = new OrderOperationsService(prisma, providersFromEnvironment())
    const payload = JSON.parse(rawBody) as Record<string, unknown>
    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      const intent = event.data.object as Stripe.PaymentIntent
      const outcome = event.type === "payment_intent.succeeded"
        ? "succeeded"
        : event.type === "payment_intent.canceled"
          ? "cancelled"
          : "failed"
      const result = await service.processPaymentEvent({
        provider: "stripe",
        eventId: event.id,
        eventType: event.type,
        paymentIntentId: intent.id,
        outcome,
        payload,
      })
      return NextResponse.json({ received: true, ...result })
    }

    if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
      const refund = event.data.object as Stripe.Refund
      const status = refund.status === "succeeded"
        ? "succeeded"
        : refund.status === "failed" || refund.status === "canceled"
          ? "failed"
          : "pending"
      const result = await service.processRefundEvent({
        provider: "stripe",
        eventId: event.id,
        eventType: event.type,
        providerRefundId: refund.id,
        status,
        failureReason: refund.failure_reason ?? undefined,
        payload,
      })
      return NextResponse.json({ received: true, ...result })
    }

    return NextResponse.json({ received: true, ignored: true })
  } catch (error) {
    return orderErrorResponse(error)
  }
}
