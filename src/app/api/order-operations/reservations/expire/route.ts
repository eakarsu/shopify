import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { hasPermission, validateApiKey } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { actorFromSession } from "@/lib/order/access"
import { OrderDomainError } from "@/lib/order/domain"
import { orderErrorResponse } from "@/lib/order/http"
import { providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

export async function POST(request: NextRequest) {
  try {
    const actor = actorFromSession(await getServerSession(authOptions))
    if (actor?.type !== "MERCHANT") {
      const apiAuth = await validateApiKey(request)
      if (!apiAuth.valid || !hasPermission(apiAuth.apiKey, "process:orders")) {
        throw new OrderDomainError("Merchant or process:orders permission required", "ORDER_FORBIDDEN", 403)
      }
    }
    const body = await request.json().catch(() => ({}))
    const result = await new OrderOperationsService(prisma, providersFromEnvironment()).expireReservations(body.limit)
    return NextResponse.json(result)
  } catch (error) {
    return orderErrorResponse(error)
  }
}
