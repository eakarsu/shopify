import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/personalized-recs
 *
 * Personalized recommendations driven by browse history + cart contents,
 * suitable for both product page + checkout placements.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "AI service not configured", missing: "OPENROUTER_API_KEY" }, { status: 503 })
    }
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = (session.user as { id?: string })?.id || null
    enforceAIRateLimit({ userId, request })

    const body = (await request.json().catch(() => ({}))) as {
      customerId?: string
      browseHistory?: Array<{ productId: string; title?: string; at?: string }>
      cartProductIds?: string[]
      placement?: "product_page" | "cart" | "checkout" | "homepage"
    }
    const placement = body.placement || "product_page"

    // Pull candidate products
    let candidates: Array<{ id: string; title: string; productType: string | null; price?: number }> = []
    try {
      candidates = await (prisma as any).product.findMany({
        take: 40,
        select: { id: true, title: true, productType: true, variants: { take: 1, select: { price: true } } },
      })
      candidates = candidates.map((c: any) => ({ id: c.id, title: c.title, productType: c.productType, price: c.variants?.[0]?.price ?? null }))
    } catch {
      // schema mismatch — proceed without DB context
    }

    const sys = `You are an e-commerce personalization engine. Recommend up to 6 products for placement="${placement}". Output JSON: { recommendations: [{ productId, title, reason, fitScore }], theme, urgencyTrigger? }.`
    const user = `Customer: ${body.customerId || "guest"}\nPlacement: ${placement}\nCart: ${JSON.stringify(body.cartProductIds || [])}\nBrowse: ${JSON.stringify(body.browseHistory || []).slice(0, 3000)}\nCandidates: ${JSON.stringify(candidates).slice(0, 4000)}`
    const raw = await callAI(`${sys}\n\n${user}`, { temperature: 0.5, maxTokens: 1500 })
    return NextResponse.json({ raw, parsed: parseAIJson(raw), placement })
  } catch (err: unknown) {
    const msg = (err as Error).message || "personalization failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
