import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI, DEFAULT_MODEL } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/recommendations/[customerId]
 * Generate a ranked list of AI-driven product recommendations for a customer.
 *
 * Pattern matches src/app/api/ai/products/[id]/review-sentiment/route.ts:
 *   - admin-gated
 *   - AI rate-limited
 *   - logs to AIResult (success or failure)
 *   - returns structured JSON
 *
 * Implements audit recommendation: "Explicit product-recommendation endpoint"
 * (_AUDIT_NOTE.md backlog item #3).
 */
interface RankedRecommendation {
  productId: string
  title: string
  reason: string
  fit_score: number
}

interface RecommendationsResponse {
  recommendations: RankedRecommendation[]
  customer_persona: string
  cross_sell_themes: string[]
  upsell_themes: string[]
  notes: string[]
}

const PRODUCT_POOL_LIMIT = 60
const ORDER_HISTORY_LIMIT = 25
const CART_ITEMS_LIMIT = 25

export async function POST(request: NextRequest, props: { params: Promise<{ customerId: string }> }) {
  const params = await props.params;
  const start = Date.now()
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured. OPENROUTER_API_KEY missing." },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any)?.id || null
    enforceAIRateLimit({ userId, request })

    const customerId = params.customerId
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Pull recent purchase history through orders -> orderItems
    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        items: {
          take: 10,
          select: {
            productId: true,
            title: true,
            quantity: true,
            price: true
          }
        }
      }
    })

    const purchasedItems = orders
      .flatMap((o) => o.items)
      .slice(0, ORDER_HISTORY_LIMIT)

    // Pull active cart items (anchored on email match where possible)
    let cartItems: { productId: string; title: string; quantity: number }[] = []
    try {
      const carts = await prisma.cart.findMany({
        where: {
          OR: [
            { customerAccount: { email: customer.email } as any }
          ]
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          items: {
            take: CART_ITEMS_LIMIT,
            select: {
              productId: true,
              quantity: true,
              product: { select: { title: true } }
            }
          }
        }
      })
      cartItems = carts
        .flatMap((c) =>
          c.items.map((i) => ({
            productId: i.productId,
            title: i.product?.title || "(unknown)",
            quantity: i.quantity
          }))
        )
        .slice(0, CART_ITEMS_LIMIT)
    } catch (_) {
      // non-fatal
    }

    const purchasedProductIds = new Set(
      purchasedItems.map((i) => i.productId).filter((v): v is string => !!v)
    )

    // Candidate pool: most recent in-stock products, excluding ones already
    // purchased by this customer.
    const candidates = await prisma.product.findMany({
      where: {
        id: { notIn: Array.from(purchasedProductIds) },
        status: "ACTIVE"
      },
      orderBy: { createdAt: "desc" },
      take: PRODUCT_POOL_LIMIT,
      select: {
        id: true,
        title: true,
        productType: true,
        vendor: true,
        price: true,
        tags: true
      }
    })

    if (candidates.length === 0) {
      return NextResponse.json({
        customerId,
        result: {
          recommendations: [],
          customer_persona: "no candidate inventory",
          cross_sell_themes: [],
          upsell_themes: [],
          notes: ["No active products outside the customer's purchase history."]
        },
        aiUsed: false
      })
    }

    const purchasedBlock = purchasedItems
      .map(
        (i, idx) => `${idx + 1}. ${i.title} (qty=${i.quantity}, price=${i.price})`
      )
      .join("\n") || "(no purchase history)"
    const cartBlock = cartItems
      .map(
        (i, idx) => `${idx + 1}. ${i.title} (qty=${i.quantity})`
      )
      .join("\n") || "(no active cart)"
    const candidateBlock = candidates
      .map(
        (p, idx) =>
          `${idx + 1}. id=${p.id} | ${p.title} | type=${p.productType || "n/a"} | vendor=${p.vendor || "n/a"} | price=${p.price} | tags=${(p.tags || []).join(", ")}`
      )
      .join("\n")

    const prompt = `Recommend products for an existing customer.

Customer: ${customer.firstName} ${customer.lastName} <${customer.email}>

Recent purchases:
${purchasedBlock}

Active cart:
${cartBlock}

Candidate catalog (only choose products from this list — match on the exact id):
${candidateBlock}

Return JSON with this shape:
{
  "recommendations": [
    { "productId": "string (must come from candidates)", "title": "string", "reason": "string", "fit_score": number 0-1 }
  ],
  "customer_persona": "short persona description",
  "cross_sell_themes": ["string"],
  "upsell_themes": ["string"],
  "notes": ["string"]
}

Pick at most 8 recommendations and rank by fit_score descending.`

    let raw = ""
    let parsed: Partial<RecommendationsResponse> | null = null
    let aiError: string | null = null

    try {
      raw = await callAI(prompt, {
        systemPrompt: `You are an expert e-commerce recommender system.
You only recommend products that exist in the supplied candidate list (match by id).
Always respond with valid JSON only — no commentary outside the JSON object.`,
        temperature: 0.3,
        maxTokens: 1200,
        responseFormat: { type: "json_object" }
      })
      parsed = parseAIJson<Partial<RecommendationsResponse>>(raw, null)
    } catch (e: any) {
      aiError = e?.message || String(e)
      console.error("AI recommendations failed:", aiError)
    }

    await prisma.aIResult
      .create({
        data: {
          userId,
          feature: "customer_recommendations",
          productId: null,
          model: DEFAULT_MODEL,
          latencyMs: Date.now() - start,
          ai_results: (parsed as any) || {},
          rawResponse: raw || null,
          error: aiError
        }
      })
      .catch((err: any) =>
        console.warn("[recommendations] failed to log AIResult:", err.message)
      )

    if (!parsed) {
      return NextResponse.json(
        { error: "AI recommendations failed: " + (aiError || "unparseable response") },
        { status: 502 }
      )
    }

    // Clamp recommendations to candidates that actually exist (id whitelist)
    const candidateIds = new Set(candidates.map((c) => c.id))
    const filtered = (parsed.recommendations || [])
      .filter((r) => r && r.productId && candidateIds.has(r.productId))
      .slice(0, 12)

    const result: RecommendationsResponse = {
      recommendations: filtered.map((r) => ({
        productId: r.productId,
        title: r.title || candidates.find((c) => c.id === r.productId)?.title || "",
        reason: r.reason || "",
        fit_score: typeof r.fit_score === "number" ? r.fit_score : 0
      })),
      customer_persona: parsed.customer_persona || "",
      cross_sell_themes: parsed.cross_sell_themes || [],
      upsell_themes: parsed.upsell_themes || [],
      notes: parsed.notes || []
    }

    return NextResponse.json({
      customerId,
      result,
      aiUsed: true
    })
  } catch (error: any) {
    if (error?.message?.includes("AI rate limit")) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    console.error("Recommendations error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
