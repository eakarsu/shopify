import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { callAI } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"
import { enforceAIRateLimit } from "@/lib/ai-rate-limit"

/**
 * POST /api/ai/abandoned-cart-recover
 *
 * Generate a 3-stage recovery email sequence + suggested incentive ladder.
 * Recovery dispatch wired via cron when SENDGRID_API_KEY is set.
 * TODO: configure credentials — SENDGRID_API_KEY (or RESEND_API_KEY).
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
      cartId?: string
      customerEmail?: string
      itemSummary?: Array<{ title: string; quantity: number; priceUSD: number }>
      hoursSinceAbandon?: number
    }
    if (!body.cartId || !body.itemSummary?.length) {
      return NextResponse.json({ error: "cartId and itemSummary[] required" }, { status: 400 })
    }

    const sys = "You are an abandoned-cart copywriter. Produce a 3-stage email sequence with delays (e.g., +1h, +24h, +72h), each with subject + 2-paragraph body. Stage 3 includes a 10% incentive code. Output JSON."
    const user = `Cart: ${body.cartId}\nHoursSince: ${body.hoursSinceAbandon ?? 1}\nItems: ${JSON.stringify(body.itemSummary)}`
    const raw = await callAI(`${sys}\n\n${user}`, { temperature: 0.6, maxTokens: 1500 })
    return NextResponse.json({
      raw,
      parsed: parseAIJson(raw),
      dispatchReady: !!(process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY),
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "abandoned-cart-recover failed" }, { status: 500 })
  }
}
