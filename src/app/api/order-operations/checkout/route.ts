import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireOrderActor } from "@/lib/order/access"
import { orderErrorResponse, requireIdempotencyKey } from "@/lib/order/http"
import { providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

export async function POST(request: NextRequest) {
  try {
    const actor = requireOrderActor(await getServerSession(authOptions))
    const idempotencyKey = requireIdempotencyKey(request)
    const body = await request.json()
    const result = await new OrderOperationsService(prisma, providersFromEnvironment()).placeOrder(
      { ...body, idempotencyKey },
      actor,
    )
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return orderErrorResponse(error)
  }
}
