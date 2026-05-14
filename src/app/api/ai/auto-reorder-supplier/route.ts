import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/auto-reorder-supplier
 *
 * Forecast demand for a SKU and propose a supplier purchase order.
 * TODO: configure credentials — SUPPLIER_API_KEY (per-vendor base URLs).
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 })
    }
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }
    enforceAIRateLimit({ userId: (session.user as any)?.id || null, request })

    const body = (await request.json().catch(() => ({}))) as {
      productId?: string
      lookbackDays?: number
      coverageWeeks?: number
    }
    if (!body.productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

    const lookback = body.lookbackDays ?? 90
    const coverage = body.coverageWeeks ?? 4
    const since = new Date(Date.now() - lookback * 24 * 3600 * 1000)

    let totalSold = 0
    let onHand = 0
    let title = ""
    try {
      const orderItems = await (prisma as any).orderItem.findMany({
        where: { productId: body.productId, createdAt: { gte: since } },
        select: { quantity: true },
      })
      totalSold = orderItems.reduce((s: number, oi: any) => s + Number(oi.quantity || 0), 0)
      const product = await (prisma as any).product.findUnique({
        where: { id: body.productId },
        select: { title: true, variants: { select: { inventoryQuantity: true } } },
      })
      title = product?.title || ""
      onHand = (product?.variants || []).reduce((s: number, v: any) => s + Number(v.inventoryQuantity || 0), 0)
    } catch {
      // tolerate schema drift
    }

    const dailyRun = totalSold / Math.max(1, lookback)
    const forecastedDemand = Math.ceil(dailyRun * 7 * coverage)
    const recommendedReorder = Math.max(0, forecastedDemand - onHand)

    const sys = "You are an inventory planner. Validate the recommended reorder quantity vs. lead time and safety stock; suggest preferred vendor + PO terms. Output JSON: { recommendedQty, leadTimeDays, vendorPreference, safetyStock, notes }."
    const user = `Product: ${body.productId} (${title})\nOnHand: ${onHand}\nDailyRun: ${dailyRun.toFixed(2)}\nForecast(${coverage}wk): ${forecastedDemand}\nProposed: ${recommendedReorder}`
    const raw = await callAI(`${sys}\n\n${user}`, { temperature: 0.3, maxTokens: 700 })
    return NextResponse.json({
      productId: body.productId,
      onHand,
      dailyRun,
      forecastedDemand,
      recommendedReorder,
      parsed: parseAIJson(raw),
      raw,
      supplierApiReady: !!process.env.SUPPLIER_API_KEY,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "auto-reorder failed" }, { status: 500 })
  }
}
