import { NextRequest, NextResponse } from "next/server"
import { trackEvent, AnalyticsEventType } from "@/lib/analytics"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, productId, orderId, data } = body

    // Validate event type
    const validTypes: AnalyticsEventType[] = [
      "page_view",
      "product_view",
      "add_to_cart",
      "remove_from_cart",
      "begin_checkout",
      "purchase",
      "search",
      "newsletter_signup"
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    // Get or create session ID
    const cookieStore = await cookies()
    let sessionId = cookieStore.get("analytics_session")?.value

    if (!sessionId) {
      sessionId = uuidv4()
      // Note: Can't set cookies in API route, client should handle this
    }

    // Get customer ID if logged in
    const customerId = cookieStore.get("customerId")?.value

    await trackEvent({
      type,
      sessionId,
      customerId,
      productId,
      orderId,
      data
    })

    return NextResponse.json({ success: true, sessionId })
  } catch (error: any) {
    console.error("Analytics tracking error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
