import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/ai/products/:id/revisions?page=1&pageSize=20
 *   Paginated list of every AI-generated description revision for a product.
 *   Implements the paginated lists pattern.
 *
 * POST /api/ai/products/:id/revisions
 *   body: { revisionId, action: "apply" | "promote" }
 *   Applies a chosen revision to the product (or promotes the A/B winner).
 */

const MAX_PAGE_SIZE = 100

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)))

  const [rows, total] = await Promise.all([
    prisma.productDescriptionRevision.findMany({
      where: { productId: params.id },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize
    }),
    prisma.productDescriptionRevision.count({ where: { productId: params.id } })
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const { revisionId, action } = body
  if (!revisionId || !["apply", "promote"].includes(action)) {
    return NextResponse.json({ error: "revisionId and action (apply|promote) required" }, { status: 400 })
  }

  const revision = await prisma.productDescriptionRevision.findUnique({ where: { id: revisionId } })
  if (!revision || revision.productId !== params.id) {
    return NextResponse.json({ error: "Revision not found for this product" }, { status: 404 })
  }

  if (action === "promote") {
    // Pick the highest-conversion revision automatically
    const winner = await prisma.productDescriptionRevision.findFirst({
      where: { productId: params.id, impressions: { gt: 0 } },
      orderBy: [{ conversions: "desc" }, { impressions: "desc" }]
    })
    if (!winner) {
      return NextResponse.json({ error: "No revisions with impressions to promote" }, { status: 400 })
    }
    await prisma.product.update({
      where: { id: params.id },
      data: {
        description: winner.fullDescription || undefined,
        ...(winner.seoDescription ? { seoDescription: winner.seoDescription } : {})
      }
    })
    await prisma.productDescriptionRevision.updateMany({
      where: { productId: params.id, appliedToProduct: true },
      data: { appliedToProduct: false }
    })
    await prisma.productDescriptionRevision.update({
      where: { id: winner.id },
      data: { appliedToProduct: true }
    })
    return NextResponse.json({ ok: true, applied: winner.id, action: "promote" })
  }

  // action === "apply"
  await prisma.product.update({
    where: { id: params.id },
    data: {
      description: revision.fullDescription || undefined,
      ...(revision.seoDescription ? { seoDescription: revision.seoDescription } : {})
    }
  })
  await prisma.productDescriptionRevision.updateMany({
    where: { productId: params.id, appliedToProduct: true },
    data: { appliedToProduct: false }
  })
  await prisma.productDescriptionRevision.update({
    where: { id: revisionId },
    data: { appliedToProduct: true }
  })

  return NextResponse.json({ ok: true, applied: revisionId, action: "apply" })
}
