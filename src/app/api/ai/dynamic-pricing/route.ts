import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI, DEFAULT_MODEL } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/dynamic-pricing
 *
 * Apply pass 5 — backlog item #2: Dynamic-pricing endpoint.
 *
 * PRODUCT-DECISION: A real dynamic-pricing engine needs competitor-feed
 * ingestion (third-party scrapers / data providers, NEEDS-CREDS). This
 * endpoint instead uses internal sales data only — last 60 days of OrderItems
 * for the product — to derive a price-elasticity heuristic the LLM uses to
 * suggest a price band. Competitor pricing is accepted as optional input
 * (`competitor_prices`) but never fetched live.
 *
 * Returns 503 + missing when OPENROUTER_API_KEY is unset.
 */
const ELASTICITY_WINDOW_DAYS = 60

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
    const competitorPrices: number[] = Array.isArray(body?.competitor_prices)
      ? body.competitor_prices.map((n: any) => Number(n)).filter((n: number) => isFinite(n) && n > 0)
      : []
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        price: true,
        compareAtPrice: true,
        productType: true,
        vendor: true,
      },
    })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const since = new Date(Date.now() - ELASTICITY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const items = await prisma.orderItem.findMany({
      where: {
        productId,
        order: { createdAt: { gte: since } },
      },
      select: { price: true, quantity: true },
      take: 5000,
    })

    const totalUnits = items.reduce((s, i) => s + i.quantity, 0)
    const totalRevenue = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
    const avgSellingPrice = totalUnits > 0 ? totalRevenue / totalUnits : Number(product.price)

    // Cheap heuristic: build a price-quantity scatter
    const buckets = new Map<string, number>()
    for (const it of items) {
      const key = Number(it.price).toFixed(2)
      buckets.set(key, (buckets.get(key) || 0) + it.quantity)
    }
    const priceQty = Array.from(buckets.entries())
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(0, 25)
      .map(([p, q]) => `$${p}: ${q} units`)
      .join("\n") || "(no sales in window)"

    const compBlock = competitorPrices.length > 0
      ? competitorPrices.map((p) => `$${p.toFixed(2)}`).join(", ")
      : "(none provided — internal data only)"

    const prompt = `You are a retail pricing analyst. Suggest a price band for this product based on sales elasticity.

Product: ${product.title} (id=${product.id}, vendor=${product.vendor || "n/a"})
Current price: $${Number(product.price).toFixed(2)}
Compare-at price: ${product.compareAtPrice ? "$" + Number(product.compareAtPrice).toFixed(2) : "n/a"}
Avg selling price last ${ELASTICITY_WINDOW_DAYS} days: $${avgSellingPrice.toFixed(2)}
Total units last ${ELASTICITY_WINDOW_DAYS} days: ${totalUnits}
Total revenue last ${ELASTICITY_WINDOW_DAYS} days: $${totalRevenue.toFixed(2)}

Price → quantity sold (last ${ELASTICITY_WINDOW_DAYS} days):
${priceQty}

Competitor prices: ${compBlock}

Return JSON:
{
  "recommended_price": number,
  "price_band": { "min": number, "max": number },
  "expected_unit_lift_pct": number,
  "expected_revenue_lift_pct": number,
  "elasticity_estimate": "elastic|inelastic|unit",
  "rationale": "string",
  "risk_flags": ["string"],
  "confidence": "low|medium|high"
}`

    let raw = ""
    let parsed: any = null
    let aiError: string | null = null
    try {
      raw = await callAI(prompt, {
        systemPrompt:
          "You are a retail pricing analyst. Return valid JSON only — no commentary outside the JSON object.",
        temperature: 0.2,
        maxTokens: 800,
        responseFormat: { type: "json_object" },
      })
      parsed = parseAIJson(raw, null)
    } catch (e: any) {
      aiError = e?.message || String(e)
      console.error("AI dynamic pricing failed:", aiError)
    }

    if (!parsed) {
      const cur = Number(product.price)
      parsed = {
        recommended_price: Number(cur.toFixed(2)),
        price_band: { min: Number((cur * 0.9).toFixed(2)), max: Number((cur * 1.1).toFixed(2)) },
        expected_unit_lift_pct: 0,
        expected_revenue_lift_pct: 0,
        elasticity_estimate: "unit",
        rationale: "Heuristic fallback (LLM call unavailable or unparsed).",
        risk_flags: [],
        confidence: "low",
      }
    }

    await prisma.aIResult
      .create({
        data: {
          userId,
          feature: "dynamic_pricing",
          productId,
          model: DEFAULT_MODEL,
          latencyMs: Date.now() - start,
          ai_results: parsed,
          rawResponse: raw || null,
          error: aiError,
        },
      })
      .catch((err: any) =>
        console.warn("[dynamic-pricing] failed to log AIResult:", err.message)
      )

    return NextResponse.json({
      productId,
      windowDays: ELASTICITY_WINDOW_DAYS,
      totals: { totalUnits, totalRevenue, avgSellingPrice },
      result: parsed,
      aiUsed: !aiError,
    })
  } catch (error: any) {
    if (error?.message?.includes("AI rate limit")) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    console.error("Dynamic pricing error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
