import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { callAI } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/review-aggregate
 *
 * Aggregate reviews from external channels + internal store; summarize sentiment;
 * flag quality issues; surface themes.
 *
 * TODO: configure credentials — TRUSTPILOT_API_KEY, GOOGLE_REVIEWS_API_KEY,
 * AMAZON_AFFILIATE_TAG (for cross-platform review pull). v0 accepts inline reviews.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 })
    }
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    enforceAIRateLimit({ userId: (session.user as any)?.id || null, request })

    const body = (await request.json().catch(() => ({}))) as {
      productId?: string
      reviews?: Array<{ source: string; rating?: number; text: string; date?: string }>
    }
    if (!body.reviews?.length) {
      return NextResponse.json({ error: "reviews[] required (or wire external sources via TODO creds)" }, { status: 400 })
    }

    const reviewSample = body.reviews.slice(0, 80)
    const sys = "You are a review aggregator. Compute overall sentiment (-1..1), break out by source, surface top 5 themes (positive + negative), flag urgent quality issues (defects, safety, fulfillment), and suggest 3 menu/product/copy adjustments. Output JSON."
    const user = `Product: ${body.productId || "unspecified"}\nReviews (${reviewSample.length}): ${JSON.stringify(reviewSample)}`
    const raw = await callAI(`${sys}\n\n${user}`, { temperature: 0.4, maxTokens: 1500 })
    return NextResponse.json({ raw, parsed: parseAIJson(raw), count: body.reviews.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "review-aggregate failed" }, { status: 500 })
  }
}
