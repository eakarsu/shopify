import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { callAI, DEFAULT_MODEL } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"

interface SearchIntent {
  primaryTerms: string[]
  synonyms: string[]
  category?: string
  priceRange?: { min?: number; max?: number }
  attributes: string[]
  intent: "browse" | "specific" | "gift" | "comparison"
  expandedQuery: string
}

async function extractSearchIntent(query: string): Promise<SearchIntent> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return {
      primaryTerms: query.toLowerCase().split(/\s+/).filter(t => t.length > 2),
      synonyms: [],
      attributes: [],
      intent: "browse",
      expandedQuery: query
    }
  }

  // Telemetry log: write a row to ai_results regardless of outcome
  const start = Date.now()
  let parsed: SearchIntent | null = null
  let raw = ""
  let err: string | null = null

  try {
    raw = await callAI(
      `Analyze this search query for an e-commerce store: "${query}"

Extract:
1. Primary search terms (most important keywords)
2. Synonyms and alternative terms the user might mean
3. Product category if detectable
4. Price range if mentioned (e.g., "cheap", "luxury", "$50")
5. Product attributes (color, size, material, etc.)
6. User intent (browse=general browsing, specific=knows what they want, gift=buying for someone, comparison=comparing options)
7. An expanded query combining original + synonyms for broader matching

Respond ONLY with this JSON:
{
  "primaryTerms": ["term1", "term2"],
  "synonyms": ["syn1", "syn2"],
  "category": "category or null",
  "priceRange": {"min": null, "max": null},
  "attributes": ["attribute1"],
  "intent": "browse|specific|gift|comparison",
  "expandedQuery": "expanded search string"
}`,
      {
        systemPrompt: `You are a search query understanding engine for an e-commerce store.
Extract search intent and expand queries with relevant synonyms and related terms.
Respond ONLY with valid JSON.`,
        temperature: 0.1,
        maxTokens: 400,
        responseFormat: { type: "json_object" }
      }
    )
    parsed = parseAIJson<SearchIntent>(raw, null)
  } catch (e: any) {
    err = e?.message || String(e)
  }

  // Best-effort persist (don't block search on telemetry failure)
  prisma.aIResult.create({
    data: {
      feature: "search_intent",
      model: DEFAULT_MODEL,
      latencyMs: Date.now() - start,
      ai_results: (parsed as any) || {},
      rawResponse: raw || null,
      error: err
    }
  }).catch(() => {})

  if (parsed) return parsed
  throw new Error(err || "AI search intent failed")
}

function scoreProductRelevance(
  product: any,
  intent: SearchIntent,
  originalQuery: string
): number {
  let score = 0
  const lowerQuery = originalQuery.toLowerCase()
  const allTerms = [...intent.primaryTerms, ...intent.synonyms].map(t => t.toLowerCase())

  // Exact title match (highest weight)
  if (product.title.toLowerCase().includes(lowerQuery)) score += 100

  // Primary term matches in title
  for (const term of intent.primaryTerms) {
    if (product.title.toLowerCase().includes(term)) score += 40
  }

  // Synonym matches in title
  for (const syn of intent.synonyms) {
    if (product.title.toLowerCase().includes(syn)) score += 20
  }

  // Any term in description
  for (const term of allTerms) {
    if (product.description?.toLowerCase().includes(term)) score += 10
  }

  // Category match
  if (intent.category && product.productType?.toLowerCase().includes(intent.category.toLowerCase())) {
    score += 30
  }

  // Tag matches
  for (const term of allTerms) {
    if (product.tags?.some((tag: string) => tag.toLowerCase().includes(term))) score += 15
  }

  // Vendor match
  for (const term of allTerms) {
    if (product.vendor?.toLowerCase().includes(term)) score += 10
  }

  // Price range fit
  if (intent.priceRange) {
    const price = Number(product.price)
    if (intent.priceRange.min && price < intent.priceRange.min) score -= 20
    if (intent.priceRange.max && price > intent.priceRange.max) score -= 20
    if (
      (!intent.priceRange.min || price >= intent.priceRange.min) &&
      (!intent.priceRange.max || price <= intent.priceRange.max)
    ) score += 15
  }

  return score
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [], total: 0, intent: null })
    }

    // Extract AI intent (with graceful fallback)
    let intent: SearchIntent
    let aiUsed = false
    try {
      intent = await extractSearchIntent(query)
      aiUsed = true
    } catch (err) {
      console.warn("AI intent extraction failed, using basic search:", err)
      intent = {
        primaryTerms: query.toLowerCase().split(/\s+/).filter(t => t.length > 2),
        synonyms: [],
        attributes: [],
        intent: "browse",
        expandedQuery: query
      }
    }

    // Build a broad WHERE clause using all terms + synonyms
    const allSearchTerms = [
      ...intent.primaryTerms,
      ...intent.synonyms,
      ...query.toLowerCase().split(/\s+/).filter(t => t.length > 1)
    ]

    // Use OR across all expanded terms for maximum recall
    const termConditions = allSearchTerms.map(term => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { vendor: { contains: term, mode: "insensitive" as const } },
        { productType: { contains: term, mode: "insensitive" as const } },
        { tags: { has: term } },
      ]
    }))

    const where: any = {
      status: "ACTIVE",
      OR: termConditions.length > 0 ? termConditions : [
        { title: { contains: query, mode: "insensitive" } }
      ]
    }

    // Apply category filter if AI detected one
    if (intent.category) {
      where.OR = [
        ...where.OR,
        { productType: { contains: intent.category, mode: "insensitive" } }
      ]
    }

    // Apply price range from AI
    if (intent.priceRange?.min !== undefined && intent.priceRange.min !== null) {
      where.price = { ...where.price, gte: intent.priceRange.min }
    }
    if (intent.priceRange?.max !== undefined && intent.priceRange.max !== null) {
      where.price = { ...where.price, lte: intent.priceRange.max }
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        images: true,
        productType: true,
        vendor: true,
        tags: true,
        description: true,
      },
      take: limit * 3, // Fetch more for re-ranking
      skip: 0,
    })

    // AI-powered relevance scoring and re-ranking
    const scored = products
      .map(p => ({
        ...p,
        _score: scoreProductRelevance(p, intent, query)
      }))
      .sort((a, b) => b._score - a._score)

    const paginated = scored.slice(offset, offset + limit)

    return NextResponse.json({
      products: paginated.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        image: (p.images as any)?.[0]?.url || (Array.isArray(p.images) ? p.images[0] : null),
        category: p.productType || null,
        vendor: p.vendor || null,
        relevanceScore: p._score
      })),
      total: scored.length,
      intent: aiUsed ? {
        detectedIntent: intent.intent,
        expandedTerms: [...intent.primaryTerms, ...intent.synonyms],
        detectedCategory: intent.category || null,
        priceRange: intent.priceRange || null
      } : null,
      aiEnhanced: aiUsed,
      query
    })
  } catch (error: any) {
    console.error("AI search error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
