import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Update order payment status
        await prisma.order.updateMany({
          where: { paymentIntentId: paymentIntent.id },
          data: {
            financialStatus: "PAID",
            paymentStatus: "completed"
          }
        })

        // Fire webhook event
        await fireWebhook("order.paid", { paymentIntentId: paymentIntent.id })
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        await prisma.order.updateMany({
          where: { paymentIntentId: paymentIntent.id },
          data: {
            paymentStatus: "failed"
          }
        })

        await fireWebhook("payment.failed", { paymentIntentId: paymentIntent.id })
        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge

        if (charge.payment_intent) {
          await prisma.order.updateMany({
            where: { paymentIntentId: charge.payment_intent as string },
            data: {
              financialStatus: charge.amount_refunded === charge.amount ? "REFUNDED" : "PARTIALLY_REFUNDED"
            }
          })

          await fireWebhook("order.refunded", { chargeId: charge.id })
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function fireWebhook(event: string, data: any) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
      events: { has: event }
    }
  })

  for (const webhook of webhooks) {
    try {
      await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhook.secret || "",
          "X-Webhook-Event": event
        },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
      })
    } catch (error) {
      console.error(`Failed to send webhook to ${webhook.url}:`, error)
    }
  }
}
