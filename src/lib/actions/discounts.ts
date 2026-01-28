"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function createDiscount(data: {
  code: string
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING"
  value: number
  minPurchaseAmount?: number
  minPurchaseQuantity?: number
  usageLimit?: number
  onePerCustomer?: boolean
  startDate: Date
  endDate?: Date
}) {
  // Check if code already exists
  const existing = await db.discount.findUnique({
    where: { code: data.code }
  })

  if (existing) {
    throw new Error("Discount code already exists")
  }

  const now = new Date()
  let status: "ACTIVE" | "SCHEDULED" | "EXPIRED" = "ACTIVE"

  if (data.startDate > now) {
    status = "SCHEDULED"
  } else if (data.endDate && data.endDate < now) {
    status = "EXPIRED"
  }

  const discount = await db.discount.create({
    data: {
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      minPurchaseAmount: data.minPurchaseAmount,
      minPurchaseQuantity: data.minPurchaseQuantity,
      usageLimit: data.usageLimit,
      onePerCustomer: data.onePerCustomer ?? false,
      startDate: data.startDate,
      endDate: data.endDate,
      status
    }
  })

  revalidatePath("/discounts")
  return discount
}

export async function updateDiscount(id: string, data: {
  code?: string
  type?: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING"
  value?: number
  minPurchaseAmount?: number | null
  minPurchaseQuantity?: number | null
  usageLimit?: number | null
  onePerCustomer?: boolean
  startDate?: Date
  endDate?: Date | null
  status?: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED"
}) {
  // If code is being updated, check for duplicates
  if (data.code) {
    const existing = await db.discount.findFirst({
      where: {
        code: data.code.toUpperCase(),
        NOT: { id }
      }
    })

    if (existing) {
      throw new Error("Discount code already exists")
    }

    data.code = data.code.toUpperCase()
  }

  const discount = await db.discount.update({
    where: { id },
    data
  })

  revalidatePath("/discounts")
  return discount
}

export async function deleteDiscount(id: string) {
  await db.discount.delete({
    where: { id }
  })

  revalidatePath("/discounts")
}

export async function deleteDiscounts(ids: string[]) {
  await db.discount.deleteMany({
    where: { id: { in: ids } }
  })

  revalidatePath("/discounts")
}

export async function toggleDiscountStatus(id: string) {
  const discount = await db.discount.findUnique({
    where: { id },
    select: { status: true }
  })

  if (!discount) {
    throw new Error("Discount not found")
  }

  const newStatus = discount.status === "ACTIVE" ? "DISABLED" : "ACTIVE"

  await db.discount.update({
    where: { id },
    data: { status: newStatus }
  })

  revalidatePath("/discounts")
}

export async function validateDiscountCode(code: string, subtotal: number): Promise<{
  valid: boolean
  discount?: {
    id: string
    type: string
    value: number
  }
  error?: string
}> {
  const discount = await db.discount.findUnique({
    where: { code: code.toUpperCase() }
  })

  if (!discount) {
    return { valid: false, error: "Invalid discount code" }
  }

  if (discount.status !== "ACTIVE") {
    return { valid: false, error: "Discount code is not active" }
  }

  const now = new Date()
  if (discount.startDate > now) {
    return { valid: false, error: "Discount code is not yet active" }
  }

  if (discount.endDate && discount.endDate < now) {
    return { valid: false, error: "Discount code has expired" }
  }

  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
    return { valid: false, error: "Discount code usage limit reached" }
  }

  if (discount.minPurchaseAmount && subtotal < Number(discount.minPurchaseAmount)) {
    return { valid: false, error: `Minimum purchase of $${discount.minPurchaseAmount} required` }
  }

  return {
    valid: true,
    discount: {
      id: discount.id,
      type: discount.type,
      value: Number(discount.value)
    }
  }
}

export async function incrementDiscountUsage(id: string) {
  await db.discount.update({
    where: { id },
    data: {
      usageCount: { increment: 1 }
    }
  })
}
