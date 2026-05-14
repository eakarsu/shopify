import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAIStats } from "@/lib/ai-client"

/**
 * GET /api/ai/stats — admin-only AI usage telemetry.
 * Combines in-process counters with persisted aggregates from ai_results.
 */
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const memory = getAIStats()

  const [byFeature, last24h, errors] = await Promise.all([
    prisma.aIResult.groupBy({
      by: ["feature"],
      _count: { _all: true },
      _avg: { latencyMs: true }
    }).catch(() => []),
    prisma.aIResult.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    }).catch(() => 0),
    prisma.aIResult.count({ where: { error: { not: null } } }).catch(() => 0)
  ])

  return NextResponse.json({
    inMemory: memory,
    persisted: {
      last24h,
      totalErrors: errors,
      byFeature
    }
  })
}
