import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assertOrderReadAccess, requireOrderActor } from "@/lib/order/access"
import { orderErrorResponse } from "@/lib/order/http"

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const actor = requireOrderActor(await getServerSession(authOptions))
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        items: true,
        fulfillments: { include: { items: true } },
        refunds: { orderBy: { createdAt: "asc" } },
        audits: { orderBy: { sequence: "asc" } },
        reconciliations: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    })
    assertOrderReadAccess(actor, order.customerId)
    return NextResponse.json(order)
  } catch (error) {
    return orderErrorResponse(error)
  }
}
