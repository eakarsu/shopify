import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/ai/revisions/:revisionId/track
 *  body: { event: "impression" | "conversion" }
 *
 * Increments the A/B counters on a description revision. Used by storefront
 * product pages and checkout to attribute conversions to specific copy.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ revisionId: string }> }) {
  const params = await props.params;
  const body = await request.json().catch(() => ({} as any))
  const event = body.event
  if (!["impression", "conversion"].includes(event)) {
    return NextResponse.json({ error: "event must be 'impression' or 'conversion'" }, { status: 400 })
  }

  const data = event === "impression"
    ? { impressions: { increment: 1 } }
    : { conversions: { increment: 1 } }

  try {
    const updated = await prisma.productDescriptionRevision.update({
      where: { id: params.revisionId },
      data
    })
    return NextResponse.json({
      ok: true,
      impressions: updated.impressions,
      conversions: updated.conversions
    })
  } catch (e: any) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 })
  }
}
