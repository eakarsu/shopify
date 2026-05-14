import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI, DEFAULT_MODEL } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/demand-forecast
 *
 * Apply pass 5 — backlog item #1: Demand-forecast / auto-reorder endpoint.
 *
 * PRODUCT-DECISION: A full demand-forecast model needs (a) historical
 * sales-by-day pivots and (b) supplier connections (NEEDS-CREDS). Neither is
 * available in this batch; we therefore aggregate the last 90 days of
 * OrderItems for the requested product, ask the LLM to produce a heuristic
 * 30-day forecast, and surface a reorder recommendation against current
 * Inventory totals. Supplier purchase-order push is intentionally NOT wired.
 *
 * Pattern matches src/app/api/ai/recommendations/[customerId]/route.ts:
 *   - admin gate
 *   - AI rate-limit
 *   - 503 if OPENROUTER_API_KEY missing
 *   - logs to AIResult
 */
const HISTORY_DAYS = 90
const FORECAST_HORIZON_DAYS = 30
const SAFETY_STOCK_DAYS = 7

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured", missing: "OPENROUTER_API_KEY" },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any)?.id || null
    enforceAIRateLimit({ userId, request })

    const body = await request.json().catch(() => ({}))
    const productId: string | undefined = body?.productId
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        productType: true,
        vendor: true,
        price: true,
        variants: { select: { id: true, sku: true, price: true } },
      },
    })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
    const items = await prisma.orderItem.findMany({
      where: {
        productId,
        order: { createdAt: { gte: since } },
      },
      select: {
        quantity: true,
        price: true,
        order: { select: { createdAt: true } },
      },
      take: 5000,
    })

    // Aggregate units sold per ISO date
    const unitsByDay = new Map<string, number>()
    for (const it of items) {
      const day = (it.order?.createdAt || new Date()).toISOString().slice(0, 10)
      unitsByDay.set(day, (unitsByDay.get(day) || 0) + it.quantity)
    }
    const totalUnits = items.reduce((s, i) => s + i.quantity, 0)
    const dailyAvg = totalUnits / HISTORY_DAYS

    // Current on-hand inventory across all locations for this product's variants
    let onHand = 0
    try {
      const variantIds = product.variants.map((v) => v.id)
      if (variantIds.length > 0) {
        const inv = await prisma.inventory.findMany({
          where: { variantId: { in: variantIds } },
          select: { quantity: true, reserved: true },
        })
        onHand = inv.reduce((s, r) => s + (r.quantity - r.reserved), 0)
      }
    } catch (_) {
      /* non-fatal */
    }

    const historyBlock = Array.from(unitsByDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-30)
      .map(([d, n]) => `${d}: ${n}`)
      .join("\n") || "(no recent sales)"

    const prompt = `You are a retail demand forecaster. Based on the last ${HISTORY_DAYS} days of orders, project the next ${FORECAST_HORIZON_DAYS} days.

Product: ${product.title} (id=${product.id}, vendor=${product.vendor || "n/a"})
Total units last ${HISTORY_DAYS} days: ${totalUnits}
Daily average: ${dailyAvg.toFixed(2)}
Current on-hand (qty - reserved across variants): ${onHand}

Recent daily units sold (last 30 days):
${historyBlock}

Return JSON:
{
  "expected_units_next_30d": number,
  "low_estimate": number,
  "high_estimate": number,
  "trend": "up|flat|down",
  "seasonality_notes": ["string"],
  "reorder_recommendation": {
    "suggest_reorder": boolean,
    "reorder_quantity": number,
    "rationale": "string"
  },
  "confidence": "low|medium|high"
}`

    let raw = ""
    let parsed: any = null
    let aiError: string | null = null
    try {
      raw = await callAI(prompt, {
        systemPrompt:
          "You are a retail demand forecaster. Return valid JSON only — no commentary outside the JSON object.",
        temperature: 0.2,
        maxTokens: 800,
        responseFormat: { type: "json_object" },
      })
      parsed = parseAIJson(raw, null)
    } catch (e: any) {
      aiError = e?.message || String(e)
      console.error("AI demand forecast failed:", aiError)
    }

    // Fallback heuristic so the FE always gets useful data
    if (!parsed) {
      const expected = Math.round(dailyAvg * FORECAST_HORIZON_DAYS)
      const reorderQty = Math.max(0, expected + Math.round(dailyAvg * SAFETY_STOCK_DAYS) - onHand)
      parsed = {
        expected_units_next_30d: expected,
        low_estimate: Math.round(expected * 0.7),
        high_estimate: Math.round(expected * 1.3),
        trend: "flat",
        seasonality_notes: [],
        reorder_recommendation: {
          suggest_reorder: reorderQty > 0,
          reorder_quantity: reorderQty,
          rationale: "Heuristic fallback (LLM call unavailable or unparsed).",
        },
        confidence: "low",
      }
    }

    await prisma.aIResult
      .create({
        data: {
          userId,
          feature: "demand_forecast",
          productId,
          model: DEFAULT_MODEL,
          latencyMs: Date.now() - start,
          ai_results: parsed,
          rawResponse: raw || null,
          error: aiError,
        },
      })
      .catch((err: any) =>
        console.warn("[demand-forecast] failed to log AIResult:", err.message)
      )

    return NextResponse.json({
      productId,
      historyDays: HISTORY_DAYS,
      forecastHorizonDays: FORECAST_HORIZON_DAYS,
      totals: { unitsLastWindow: totalUnits, dailyAvg, onHand },
      result: parsed,
      aiUsed: !aiError,
    })
  } catch (error: any) {
    if (error?.message?.includes("AI rate limit")) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    console.error("Demand forecast error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
