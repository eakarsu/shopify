import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * Subscription & Recurring Order Support
 * Lean v0: in-memory plans + customer subscriptions. Wire to Prisma + Stripe Billing in prod.
 * TODO: configure credentials — STRIPE_SECRET_KEY for billing cycles.
 */

interface SubscriptionPlan {
  id: string
  productId: string
  name: string
  intervalDays: number
  priceUSD: number
  discountPct?: number
}

interface CustomerSubscription {
  id: string
  customerId: string
  planId: string
  status: "active" | "paused" | "cancelled" | "auth_required"
  nextDeliveryAt: string
  createdAt: string
  cancellationReason?: string
  churnRiskScore?: number
}

const plans = new Map<string, SubscriptionPlan>()
const subs = new Map<string, CustomerSubscription>()

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as
    & { action?: "create_plan" | "subscribe" | "pause" | "cancel"; planId?: string; productId?: string }
    & Partial<SubscriptionPlan>
    & { customerId?: string; reason?: string }

  if (body.action === "create_plan") {
    if (!body.productId || !body.name || !body.intervalDays || body.priceUSD == null) {
      return NextResponse.json({ error: "productId, name, intervalDays, priceUSD required" }, { status: 400 })
    }
    const id = body.id || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const plan: SubscriptionPlan = {
      id,
      productId: body.productId,
      name: body.name,
      intervalDays: body.intervalDays,
      priceUSD: body.priceUSD,
      discountPct: body.discountPct,
    }
    plans.set(id, plan)
    return NextResponse.json({ plan })
  }

  if (body.action === "subscribe") {
    const plan = body.planId ? plans.get(body.planId) : null
    if (!plan || !body.customerId) return NextResponse.json({ error: "valid planId and customerId required" }, { status: 400 })
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const next = new Date(Date.now() + plan.intervalDays * 24 * 3600 * 1000).toISOString()
    const sub: CustomerSubscription = {
      id,
      customerId: body.customerId,
      planId: plan.id,
      status: process.env.STRIPE_SECRET_KEY ? "active" : "auth_required",
      nextDeliveryAt: next,
      createdAt: new Date().toISOString(),
    }
    subs.set(id, sub)
    return NextResponse.json({ subscription: sub, stripeReady: !!process.env.STRIPE_SECRET_KEY })
  }

  if ((body.action === "pause" || body.action === "cancel") && body.id) {
    const s = subs.get(body.id)
    if (!s) return NextResponse.json({ error: "subscription not found" }, { status: 404 })
    s.status = body.action === "pause" ? "paused" : "cancelled"
    if (body.action === "cancel") s.cancellationReason = body.reason || undefined
    return NextResponse.json({ subscription: s })
  }

  return NextResponse.json({ error: "action must be create_plan|subscribe|pause|cancel" }, { status: 400 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ plans: Array.from(plans.values()), subscriptions: Array.from(subs.values()) })
}
