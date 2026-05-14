import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST /api/shipping/rates
 *
 * Apply pass 5: NEEDS-CREDS stub for live shipping rate lookups.
 *
 * ENV VARS (any one of these enables a provider):
 *   - EASYPOST_API_KEY
 *   - SHIPPO_API_KEY
 *   - UPS_CLIENT_ID + UPS_CLIENT_SECRET
 *
 * Returns 503 + { missing } when no provider is configured.
 *
 * PRODUCT-DECISION: When credentials are present this endpoint currently
 * returns a stubbed empty rate set; live SDK calls (`@easypost/sdk`,
 * `shippo`) require dependency installs which are out of scope for this
 * batch.
 */
export async function POST(request: NextRequest) {
  const hasEasyPost = !!process.env.EASYPOST_API_KEY
  const hasShippo = !!process.env.SHIPPO_API_KEY
  const hasUps = !!(process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET)

  if (!hasEasyPost && !hasShippo && !hasUps) {
    return NextResponse.json(
      {
        error: "Shipping provider not configured",
        missing: "EASYPOST_API_KEY or SHIPPO_API_KEY or (UPS_CLIENT_ID + UPS_CLIENT_SECRET)",
      },
      { status: 503 }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const provider = hasEasyPost ? "easypost" : hasShippo ? "shippo" : "ups"
  const body = await request.json().catch(() => ({}))

  return NextResponse.json({
    provider,
    fromAddress: body?.fromAddress || null,
    toAddress: body?.toAddress || null,
    parcel: body?.parcel || null,
    rates: [],
    note: "Provider stubbed — credentials configured but live API call not yet wired.",
  })
}
