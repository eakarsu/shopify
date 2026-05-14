import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/surge-pricing
 *
 * Monitors competitor prices + demand and proposes a price tier:
 *   surge | hold | clearance.
 * Complements existing dynamic-pricing endpoint with a competitive-set lens.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "AI service not configured", missing: "OPENROUTER_API_KEY" }, { status: 503 })
    }
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }
    enforceAIRateLimit({ userId: (session.user as any)?.id || null, request })

    const body = (await request.json().catch(() => ({}))) as {
      productId?: string
      competitorPrices?: Array<{ vendor: string; priceUSD: number; lastSeenAt?: string }>
      demandSignals?: { recentViews?: number; recentSales7d?: number; cartAdds24h?: number }
    }
    if (!body.productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

    let product: any = null
    try {
      product = await (prisma as any).product.findUnique({
        where: { id: body.productId },
        select: { id: true, title: true, variants: { select: { price: true, inventoryQuantity: true } } },
      })
    } catch {
      // schema may differ
    }
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 })

    const sys = "You are a surge-pricing strategist. From competitor prices, demand signals, and stock, output JSON: { tier: 'surge'|'hold'|'clearance', recommendedPriceUSD, minimumDurationDays, rationale }. Be conservative."
    const user = `Product: ${JSON.stringify(product)}\nCompetitors: ${JSON.stringify(body.competitorPrices || [])}\nSignals: ${JSON.stringify(body.demandSignals || {})}`
    const raw = await callAI(`${sys}\n\n${user}`, { temperature: 0.3, maxTokens: 900 })
    return NextResponse.json({ raw, parsed: parseAIJson(raw) })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "surge-pricing failed" }, { status: 500 })
  }
}
