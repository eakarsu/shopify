"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function adjustInventory(variantId: string, locationId: string, quantity: number) {
  // Check if inventory record exists
  const existing = await db.inventory.findUnique({
    where: {
      variantId_locationId: {
        variantId,
        locationId
      }
    }
  })

  if (existing) {
    await db.inventory.update({
      where: {
        variantId_locationId: {
          variantId,
          locationId
        }
      },
      data: { quantity }
    })
  } else {
    await db.inventory.create({
      data: {
        variantId,
        locationId,
        quantity
      }
    })
  }

  // Update variant total inventory
  const inventories = await db.inventory.findMany({
    where: { variantId },
    select: { quantity: true }
  })

  const totalQuantity = inventories.reduce((sum, inv) => sum + inv.quantity, 0)

  await db.variant.update({
    where: { id: variantId },
    data: { inventoryQuantity: totalQuantity }
  })

  revalidatePath("/inventory")
  revalidatePath("/products")
  revalidatePath("/dashboard")
}

export async function bulkAdjustInventory(adjustments: {
  variantId: string
  locationId: string
  quantity: number
}[]) {
  for (const adj of adjustments) {
    await adjustInventory(adj.variantId, adj.locationId, adj.quantity)
  }

  revalidatePath("/inventory")
  revalidatePath("/products")
  revalidatePath("/dashboard")
}

export async function transferInventory(
  variantId: string,
  fromLocationId: string,
  toLocationId: string,
  quantity: number
) {
  const fromInventory = await db.inventory.findUnique({
    where: {
      variantId_locationId: {
        variantId,
        locationId: fromLocationId
      }
    }
  })

  if (!fromInventory || fromInventory.quantity < quantity) {
    throw new Error("Insufficient inventory at source location")
  }

  await db.$transaction([
    db.inventory.update({
      where: {
        variantId_locationId: {
          variantId,
          locationId: fromLocationId
        }
      },
      data: {
        quantity: { decrement: quantity }
      }
    }),
    db.inventory.upsert({
      where: {
        variantId_locationId: {
          variantId,
          locationId: toLocationId
        }
      },
      create: {
        variantId,
        locationId: toLocationId,
        quantity
      },
      update: {
        quantity: { increment: quantity }
      }
    })
  ])

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
  const location = await db.location.create({
    data: {
      name: data.name,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || "US",
      phone: data.phone,
      isActive: data.isActive ?? true
    }
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
  const location = await db.location.update({
    where: { id },
    data
  })

  revalidatePath("/inventory")
  revalidatePath("/settings")
  return location
}

export async function deleteLocation(id: string) {
  // Check if location has inventory
  const inventoryCount = await db.inventory.count({
    where: { locationId: id }
  })

  if (inventoryCount > 0) {
    throw new Error("Cannot delete location with inventory. Transfer inventory first.")
  }

  await db.location.delete({
    where: { id }
  })

  revalidatePath("/inventory")
  revalidatePath("/settings")
}

export async function setDefaultLocation(id: string) {
  await db.$transaction([
    db.location.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    }),
    db.location.update({
      where: { id },
      data: { isDefault: true }
    })
  ])

  revalidatePath("/settings")
}
