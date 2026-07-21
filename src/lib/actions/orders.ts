"use server"

import crypto from "crypto"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireOrderActor } from "@/lib/order/access"
import { OrderDomainError, cents } from "@/lib/order/domain"
import { providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

async function context() {
  const actor = requireOrderActor(await getServerSession(authOptions))
  return { actor, service: new OrderOperationsService(prisma, providersFromEnvironment()) }
}

function refresh(id: string) {
  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  revalidatePath("/dashboard")
}

export async function createOrder(_data: unknown): Promise<{ id: string }> {
  throw new OrderDomainError(
    "Direct admin order creation is disabled; use the inventory-backed checkout workflow",
    "UNSAFE_ORDER_PATH_DISABLED",
  )
}

export async function markOrderAsPaid(_id: string): Promise<never> {
  throw new OrderDomainError(
    "Payment status is provider-owned and can only change through a signed webhook or reconciliation",
    "PROVIDER_OWNED_PAYMENT_STATE",
  )
}

export async function markOrderAsFulfilled(id: string) {
  const { actor, service } = await context()
  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: { items: true, fulfillments: { include: { items: true } } },
  })
  const fulfilled = new Map<string, number>()
  for (const item of order.fulfillments.flatMap((entry) => entry.items)) {
    fulfilled.set(item.orderItemId, (fulfilled.get(item.orderItemId) ?? 0) + item.quantity)
  }
  const items = order.items
    .map((item) => ({ orderItemId: item.id, quantity: item.quantity - (fulfilled.get(item.id) ?? 0) }))
    .filter((item) => item.quantity > 0)
  const result = await service.createFulfillment({ orderId: id, items, idempotencyKey: crypto.randomUUID() }, actor)
  refresh(id)
  return result
}

export async function markOrderAsPartiallyFulfilled(_id: string): Promise<never> {
  throw new OrderDomainError("Partial fulfillment requires explicit item quantities", "FULFILLMENT_ITEMS_REQUIRED", 400)
}

export async function cancelOrder(id: string) {
  const { actor, service } = await context()
  const result = await service.cancelOrder(id, crypto.randomUUID(), actor)
  refresh(id)
  return result
}

export async function refundOrder(id: string) {
  const { actor, service } = await context()
  const order = await prisma.order.findUniqueOrThrow({ where: { id } })
  const result = await service.refundOrder(id, cents(order.totalPrice), "Merchant full-order refund", crypto.randomUUID(), actor)
  refresh(id)
  revalidatePath("/customers")
  return result
}

export async function archiveOrder(id: string) {
  const { actor, service } = await context()
  const result = await service.archiveOrder(id, crypto.randomUUID(), actor)
  refresh(id)
  return result
}

export async function addOrderNote(id: string, note: string) {
  const { actor, service } = await context()
  const result = await service.addOrderNote(id, note, crypto.randomUUID(), actor)
  refresh(id)
  return result
}
