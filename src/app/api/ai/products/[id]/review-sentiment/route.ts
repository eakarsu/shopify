import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI, DEFAULT_MODEL } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/products/[id]/review-sentiment
 * Aggregate sentiment analysis over a product's existing reviews.
 *
 * Pattern matches src/app/api/ai/products/[id]/generate-description/route.ts:
 *   - admin-gated
 *   - AI rate-limited
 *   - logs to AIResult (success or failure)
 *   - returns parsed JSON shape
 *
 * Implements audit recommendation: "Review Aggregation & Sentiment Analysis"
 * (batch_11.md → shopify §Custom Feature Suggestions #5).
 */
interface SentimentSummary {
  overallSentiment: "positive" | "negative" | "mixed" | "neutral"
  sentimentScore: number // -1.0 .. 1.0
  averageRating: number
  totalReviews: number
  topPositiveThemes: string[]
  topNegativeThemes: string[]
  representativePositive?: string
  representativeNegative?: string
  flaggedIssues: string[] // potential quality / safety / fulfilment issues
  suggestedActions: string[]
}

const REVIEW_SAMPLE_LIMIT = 50

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const start = Date.now()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any)?.id || null
    enforceAIRateLimit({ userId, request })

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, productType: true, vendor: true }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const reviews = await prisma.review.findMany({
      where: { productId: params.id, isApproved: true },
      orderBy: { createdAt: "desc" },
      take: REVIEW_SAMPLE_LIMIT,
      select: { rating: true, title: true, content: true, isVerified: true }
    })

    if (reviews.length === 0) {
      return NextResponse.json({
        productId: params.id,
        productTitle: product.title,
        summary: {
          overallSentiment: "neutral",
          sentimentScore: 0,
          averageRating: 0,
          totalReviews: 0,
          topPositiveThemes: [],
          topNegativeThemes: [],
          flaggedIssues: [],
          suggestedActions: ["Solicit reviews from recent buyers."]
        } as SentimentSummary,
        aiUsed: false
      })
    }

    const avgRating =
      reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

    const reviewsBlock = reviews
      .map((r, i) => {
        const verifiedTag = r.isVerified ? " [verified]" : ""
        const title = r.title ? `${r.title}\n` : ""
        return `Review ${i + 1} — ${r.rating}/5${verifiedTag}\n${title}${r.content}`
      })
      .join("\n\n")

    const prompt = `Analyze the sentiment of customer reviews for an e-commerce product.

Product: ${product.title}
Category: ${product.productType || "General"}
Brand: ${product.vendor || "Unknown"}
Reviews analysed: ${reviews.length} (most recent ${REVIEW_SAMPLE_LIMIT} cap)
Average star rating: ${avgRating.toFixed(2)}/5

Reviews:
${reviewsBlock}

Return JSON with the following shape:
{
  "overallSentiment": "positive|negative|mixed|neutral",
  "sentimentScore": number between -1 and 1,
  "topPositiveThemes": ["..."],
  "topNegativeThemes": ["..."],
  "representativePositive": "single quote that captures the positive view",
  "representativeNegative": "single quote that captures the negative view",
  "flaggedIssues": ["safety, quality, fulfilment or recurring complaint themes that warrant action"],
  "suggestedActions": ["concrete next steps for product / merchandising / support team"]
}`

    let raw = ""
    let parsed: Partial<SentimentSummary> | null = null
    let aiError: string | null = null

    try {
      raw = await callAI(prompt, {
        systemPrompt: `You are an expert customer-experience analyst.
You read e-commerce product reviews and produce concise, actionable sentiment summaries.
Always respond with valid JSON only — no commentary outside the JSON object.`,
        temperature: 0.2,
        maxTokens: 900,
        responseFormat: { type: "json_object" }
      })
      parsed = parseAIJson<Partial<SentimentSummary>>(raw, null)
    } catch (e: any) {
      aiError = e?.message || String(e)
      console.error("AI sentiment failed:", aiError)
    }

    await prisma.aIResult
      .create({
        data: {
          userId,
          feature: "review_sentiment",
          productId: params.id,
          model: DEFAULT_MODEL,
          latencyMs: Date.now() - start,
          ai_results: (parsed as any) || {},
          rawResponse: raw || null,
          error: aiError
        }
      })
      .catch((err) =>
        console.warn("[review-sentiment] failed to log AIResult:", err.message)
      )

    if (!parsed) {
      return NextResponse.json(
        { error: "AI sentiment failed: " + (aiError || "unparseable response") },
        { status: 502 }
      )
    }

    const summary: SentimentSummary = {
      overallSentiment: parsed.overallSentiment || "neutral",
      sentimentScore:
        typeof parsed.sentimentScore === "number" ? parsed.sentimentScore : 0,
      averageRating: Number(avgRating.toFixed(2)),
      totalReviews: reviews.length,
      topPositiveThemes: parsed.topPositiveThemes || [],
      topNegativeThemes: parsed.topNegativeThemes || [],
      representativePositive: parsed.representativePositive,
      representativeNegative: parsed.representativeNegative,
      flaggedIssues: parsed.flaggedIssues || [],
      suggestedActions: parsed.suggestedActions || []
    }

    return NextResponse.json({
      productId: params.id,
      productTitle: product.title,
      summary,
      aiUsed: true
    })
  } catch (error: any) {
    if (error?.message?.includes("AI rate limit")) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    console.error("Review sentiment error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
