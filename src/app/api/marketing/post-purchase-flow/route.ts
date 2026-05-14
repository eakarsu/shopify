import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST /api/marketing/post-purchase-flow
 *
 * Apply pass 5: NEEDS-CREDS stub for transactional email post-purchase flows.
 *
 * ENV VARS (any one of these enables a provider):
 *   - SENDGRID_API_KEY
 *   - MAILGUN_API_KEY + MAILGUN_DOMAIN
 *   - POSTMARK_API_TOKEN
 *
 * Returns 503 + { missing } when no provider is configured.
 *
 * PRODUCT-DECISION: When credentials are present we still return a stubbed
 * scheduled-flow payload; the live ESP send is intentionally not wired here
 * because it requires SDK installs out of scope for this batch.
 */
export async function POST(request: NextRequest) {
  const hasSendGrid = !!process.env.SENDGRID_API_KEY
  const hasMailgun = !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN)
  const hasPostmark = !!process.env.POSTMARK_API_TOKEN

  if (!hasSendGrid && !hasMailgun && !hasPostmark) {
    return NextResponse.json(
      {
        error: "Email service provider not configured",
        missing: "SENDGRID_API_KEY or (MAILGUN_API_KEY + MAILGUN_DOMAIN) or POSTMARK_API_TOKEN",
      },
      { status: 503 }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const provider = hasSendGrid ? "sendgrid" : hasMailgun ? "mailgun" : "postmark"
  const body = await request.json().catch(() => ({}))

  return NextResponse.json({
    provider,
    orderId: body?.orderId || null,
    flowSteps: [
      { day: 0, template: "thank_you" },
      { day: 7, template: "review_request" },
      { day: 30, template: "reorder_reminder" },
      { day: 60, template: "winback" },
    ],
    note: "Post-purchase flow stubbed — credentials configured but live ESP send not yet wired.",
  })
}
