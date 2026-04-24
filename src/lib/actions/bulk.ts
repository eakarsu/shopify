"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

// Bulk update product status
export async function bulkUpdateProductStatus(
  ids: string[],
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
) {
  await db.product.updateMany({
    where: { id: { in: ids } },
    data: { status }
  })

  revalidatePath("/products")
  revalidatePath("/dashboard")
  return { updated: ids.length }
}

// Bulk delete products
export async function bulkDeleteProducts(ids: string[]) {
  await db.product.deleteMany({
    where: { id: { in: ids } }
  })

  revalidatePath("/products")
  revalidatePath("/dashboard")
  return { deleted: ids.length }
}

// Bulk update order status
export async function bulkUpdateOrderStatus(
  ids: string[],
  status: "OPEN" | "ARCHIVED" | "CANCELLED"
) {
  await db.order.updateMany({
    where: { id: { in: ids } },
    data: { status }
  })

  revalidatePath("/orders")
  revalidatePath("/dashboard")
  return { updated: ids.length }
}

// Bulk update order fulfillment
export async function bulkUpdateOrderFulfillment(
  ids: string[],
  fulfillmentStatus: "UNFULFILLED" | "PARTIALLY_FULFILLED" | "FULFILLED"
) {
  await db.order.updateMany({
    where: { id: { in: ids } },
    data: { fulfillmentStatus }
  })

  revalidatePath("/orders")
  return { updated: ids.length }
}

// Bulk delete orders
export async function bulkDeleteOrders(ids: string[]) {
  await db.order.deleteMany({
    where: { id: { in: ids } }
  })

  revalidatePath("/orders")
  revalidatePath("/dashboard")
  return { deleted: ids.length }
}

// Bulk delete customers
export async function bulkDeleteCustomers(ids: string[]) {
  await db.customer.deleteMany({
    where: { id: { in: ids } }
  })

  revalidatePath("/customers")
  revalidatePath("/dashboard")
  return { deleted: ids.length }
}

// Bulk update customer tags
export async function bulkUpdateCustomerTags(ids: string[], tags: string[]) {
  for (const id of ids) {
    await db.customer.update({
      where: { id },
      data: { tags }
    })
  }

  revalidatePath("/customers")
  return { updated: ids.length }
}

// Bulk update product vendor
export async function bulkUpdateProductVendor(ids: string[], vendor: string) {
  await db.product.updateMany({
    where: { id: { in: ids } },
    data: { vendor }
  })

  revalidatePath("/products")
  return { updated: ids.length }
}

// Bulk update product type
export async function bulkUpdateProductType(ids: string[], productType: string) {
  await db.product.updateMany({
    where: { id: { in: ids } },
    data: { productType }
  })

  revalidatePath("/products")
  return { updated: ids.length }
}
