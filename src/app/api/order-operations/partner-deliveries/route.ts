import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { hasPermission, validateApiKey } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { actorFromSession } from "@/lib/order/access"
import { OrderDomainError } from "@/lib/order/domain"
import { orderErrorResponse } from "@/lib/order/http"
import { processPartnerDeliveries } from "@/lib/order/partner-outbox"

export async function POST(request: NextRequest) {
  try {
    const actor = actorFromSession(await getServerSession(authOptions))
    if (actor?.type !== "MERCHANT") {
      const apiAuth = await validateApiKey(request)
      if (!apiAuth.valid || !hasPermission(apiAuth.apiKey, "process:webhooks")) {
        throw new OrderDomainError("Merchant or process:webhooks permission required", "ORDER_FORBIDDEN", 403)
      }
    }
    const body = await request.json().catch(() => ({}))
    const results = await processPartnerDeliveries(prisma, { limit: body.limit })
    return NextResponse.json({ processed: results.length, results })
  } catch (error) {
    return orderErrorResponse(error)
  }
}
