import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const MAX_PAGE_SIZE = 100

/**
 * GET /api/ai/results?page=1&pageSize=20&feature=generate_description&productId=...
 * Paginated audit log of every AI call. Admin-only.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)))
  const feature = searchParams.get("feature") || undefined
  const productId = searchParams.get("productId") || undefined

  const where: any = {}
  if (feature) where.feature = feature
  if (productId) where.productId = productId

  const [rows, total] = await Promise.all([
    prisma.aIResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize
    }),
    prisma.aIResult.count({ where })
  ])

  return NextResponse.json({
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1
    }
  })
}
