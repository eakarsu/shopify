"use server"

import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { requireOrderActor } from "@/lib/order/access"
import { OrderDomainError } from "@/lib/order/domain"

async function requireInventoryRole(merchantOnly = false) {
  const actor = requireOrderActor(await getServerSession(authOptions))
  if (merchantOnly ? actor.type !== "MERCHANT" : !["MERCHANT", "OPERATOR"].includes(actor.type)) {
    throw new OrderDomainError("Inventory permission is required", "ORDER_FORBIDDEN", 403)
  }
}

async function refreshVariant(tx: Prisma.TransactionClient, variantId: string) {
  const aggregate = await tx.inventory.aggregate({
    where: { variantId },
    _sum: { quantity: true, reserved: true },
  })
  await tx.variant.update({
    where: { id: variantId },
    data: { inventoryQuantity: Math.max(0, (aggregate._sum.quantity ?? 0) - (aggregate._sum.reserved ?? 0)) },
  })
}

export async function adjustInventory(variantId: string, locationId: string, quantity: number) {
  await requireInventoryRole()
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new OrderDomainError("Inventory quantity must be a non-negative integer", "INVALID_QUANTITY", 400)
  }
  await db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT id FROM "Inventory" WHERE "variantId" = ${variantId} AND "locationId" = ${locationId} FOR UPDATE
    `)
    const existing = await tx.inventory.findUnique({ where: { variantId_locationId: { variantId, locationId } } })
    if (existing && quantity < existing.reserved) {
      throw new OrderDomainError("Quantity cannot be lower than active reservations", "INVENTORY_RESERVED")
    }
    await tx.inventory.upsert({
      where: { variantId_locationId: { variantId, locationId } },
      create: { variantId, locationId, quantity },
      update: { quantity },
    })
    await refreshVariant(tx, variantId)
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  revalidatePath("/inventory")
  revalidatePath("/products")
  revalidatePath("/dashboard")
}

export async function bulkAdjustInventory(adjustments: Array<{ variantId: string; locationId: string; quantity: number }>) {
  await requireInventoryRole()
  for (const adjustment of adjustments) {
    await adjustInventory(adjustment.variantId, adjustment.locationId, adjustment.quantity)
  }
}

export async function transferInventory(variantId: string, fromLocationId: string, toLocationId: string, quantity: number) {
  await requireInventoryRole()
  if (!Number.isInteger(quantity) || quantity <= 0 || fromLocationId === toLocationId) {
    throw new OrderDomainError("Transfer requires distinct locations and a positive integer quantity", "INVALID_TRANSFER", 400)
  }
  await db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT id FROM "Inventory"
      WHERE "variantId" = ${variantId} AND "locationId" IN (${fromLocationId}, ${toLocationId})
      ORDER BY "locationId" FOR UPDATE
    `)
    const source = await tx.inventory.findUnique({
      where: { variantId_locationId: { variantId, locationId: fromLocationId } },
    })
    if (!source || source.quantity - source.reserved < quantity) {
      throw new OrderDomainError("Insufficient unreserved inventory at the source", "INSUFFICIENT_INVENTORY")
    }
    await tx.inventory.update({
      where: { variantId_locationId: { variantId, locationId: fromLocationId } },
      data: { quantity: { decrement: quantity } },
    })
    await tx.inventory.upsert({
      where: { variantId_locationId: { variantId, locationId: toLocationId } },
      create: { variantId, locationId: toLocationId, quantity },
      update: { quantity: { increment: quantity } },
    })
    await refreshVariant(tx, variantId)
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  revalidatePath("/inventory")
}

export async function createLocation(data: {
  name: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  isActive?: boolean
}) {
  await requireInventoryRole(true)
  const location = await db.location.create({
    data: { ...data, country: data.country || "US", isActive: data.isActive ?? true },
  })
  revalidatePath("/inventory")
  revalidatePath("/settings")
  return location
}

export async function updateLocation(id: string, data: {
  name?: string
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  phone?: string | null
  isActive?: boolean
}) {
  await requireInventoryRole(true)
  const location = await db.location.update({ where: { id }, data })
  revalidatePath("/inventory")
  revalidatePath("/settings")
  return location
}

export async function deleteLocation(id: string) {
  await requireInventoryRole(true)
  const inventoryCount = await db.inventory.count({ where: { locationId: id } })
  if (inventoryCount > 0) throw new OrderDomainError("Cannot delete a location with inventory", "LOCATION_NOT_EMPTY")
  await db.location.delete({ where: { id } })
  revalidatePath("/inventory")
  revalidatePath("/settings")
}

export async function setDefaultLocation(id: string) {
  await requireInventoryRole(true)
  await db.$transaction([
    db.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    db.location.update({ where: { id }, data: { isDefault: true } }),
  ])
  revalidatePath("/settings")
}
