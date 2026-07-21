"use server"

import crypto from "crypto"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireOrderActor } from "@/lib/order/access"
import { OrderDomainError } from "@/lib/order/domain"
import { providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

export async function createFulfillment(data: {
  orderId: string
  items: { orderItemId: string; quantity: number }[]
  idempotencyKey?: string
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  notifyCustomer?: boolean
}) {
  try {
    const actor = requireOrderActor(await getServerSession(authOptions))
    const result = await new OrderOperationsService(prisma, providersFromEnvironment()).createFulfillment({
      orderId: data.orderId,
      items: data.items,
      idempotencyKey: data.idempotencyKey ?? crypto.randomUUID(),
    }, actor)
    revalidatePath(`/admin/orders/${data.orderId}`)
    return { success: true, fulfillment: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fulfillment could not be created",
    }
  }
}

export async function updateFulfillment(..._args: unknown[]) {
  throw new OrderDomainError(
    "Shipment state is provider-owned; use the signed delivery webhook",
    "PROVIDER_OWNED_DELIVERY_STATE",
  )
}

export async function cancelFulfillment(..._args: unknown[]) {
  throw new OrderDomainError(
    "Fulfillments are immutable operational records; use the carrier return workflow",
    "IMMUTABLE_FULFILLMENT",
  )
}

export async function getCarriers() {
  return [{ id: "configured-provider", name: "Configured shipping provider", trackingUrlTemplate: "" }]
}

export async function getTrackingUrl(..._args: unknown[]): Promise<string> {
  return ""
}
