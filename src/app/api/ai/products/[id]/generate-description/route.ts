import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI, DEFAULT_MODEL } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const start = Date.now()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 20/hour per-user AI rate limit
    const userId = (session.user as any)?.id || null
    enforceAIRateLimit({ userId, request })

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { variants: { take: 5 } }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({} as any))
    const tone = body.tone || "professional"
    const audience = body.audience || "general consumers"
    const highlights: string[] = body.highlights || []
    // Audit fix: opt-in autoSave (was default true → silent overwrite)
    const autoSave = body.autoSave === true

    const variantInfo = product.variants.length > 0
      ? product.variants.map((v: any) => `${v.title} (${v.option1 || ""}${v.option2 ? "/" + v.option2 : ""})`).join(", ")
      : "Single variant"

    const prompt = `Generate product descriptions for this e-commerce product:

Product Name: ${product.title}
Category/Type: ${product.productType || "General"}
Vendor/Brand: ${product.vendor || "Unknown"}
Price: $${Number(product.price).toFixed(2)}
Tags: ${product.tags.join(", ") || "none"}
Available Variants: ${variantInfo}
Target Audience: ${audience}
Tone: ${tone}
Extra Highlights to Emphasize: ${highlights.length > 0 ? highlights.join(", ") : "none"}

Generate three description variants:
1. A short punchy description (1-2 sentences, max 150 chars) for product cards
2. A medium description (2-3 sentences) for product listings
3. A full rich description (3-5 paragraphs) for the product detail page
4. An SEO meta description (max 160 chars)
5. A list of 5-8 SEO-friendly bullet point features

Respond ONLY with this JSON:
{
  "shortDescription": "...",
  "mediumDescription": "...",
  "fullDescription": "...",
  "seoDescription": "...",
  "bulletPoints": ["...", "..."],
  "suggestedTags": ["...", "..."]
}`

    let raw = ""
    let parsed: any = null
    let aiError: string | null = null

    try {
      raw = await callAI(prompt, {
        systemPrompt: `You are an expert e-commerce copywriter. Generate compelling, SEO-optimized product descriptions that drive conversions.
Your descriptions should highlight key benefits (not just features), create emotional appeal, and naturally include relevant keywords.
Always respond with valid JSON only.`,
        temperature: 0.7,
        maxTokens: 1200,
        responseFormat: { type: "json_object" }
      })
      parsed = parseAIJson(raw, null)
    } catch (e: any) {
      aiError = e.message || String(e)
      console.error("AI generation failed:", aiError)
    }

    // Always log to ai_results JSONB (success or fail) for cost/error telemetry
    await prisma.aIResult.create({
      data: {
        userId,
        feature: "generate_description",
        productId: params.id,
        model: DEFAULT_MODEL,
        latencyMs: Date.now() - start,
        ai_results: parsed || {},
        rawResponse: raw || null,
        error: aiError
      }
    }).catch(err => console.warn("[generate-description] failed to log AIResult:", err.message))

    if (!parsed) {
      return NextResponse.json(
        { error: "AI generation failed: " + (aiError || "could not parse response") },
        { status: 502 }
      )
    }

    // Always create a revision row (no silent overwrite) — proposal #5
    const revision = await prisma.productDescriptionRevision.create({
      data: {
        productId: params.id,
        source: "ai",
        tone,
        audience,
        shortDescription: parsed.shortDescription || null,
        mediumDescription: parsed.mediumDescription || null,
        fullDescription: parsed.fullDescription || null,
        seoDescription: parsed.seoDescription || null,
        bulletPoints: parsed.bulletPoints || [],
        suggestedTags: parsed.suggestedTags || [],
        modelUsed: DEFAULT_MODEL,
        authorId: userId,
        appliedToProduct: false
      }
    })

    // Only auto-save if explicitly opted-in
    let saved = false
    if (autoSave && parsed.fullDescription) {
      await prisma.product.update({
        where: { id: params.id },
        data: {
          description: parsed.fullDescription,
          ...(parsed.seoDescription && { seoDescription: parsed.seoDescription })
        }
      })
      await prisma.productDescriptionRevision.update({
        where: { id: revision.id },
        data: { appliedToProduct: true }
      })
      saved = true
    }

    return NextResponse.json({
      productId: params.id,
      productTitle: product.title,
      revisionId: revision.id,
      generated: {
        shortDescription: parsed.shortDescription || "",
        mediumDescription: parsed.mediumDescription || "",
        fullDescription: parsed.fullDescription || "",
        seoDescription: parsed.seoDescription || "",
        bulletPoints: parsed.bulletPoints || [],
        suggestedTags: parsed.suggestedTags || []
      },
      saved,
      autoSave
    })
  } catch (error: any) {
    if (error?.message?.includes("AI rate limit")) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    console.error("Generate description error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
