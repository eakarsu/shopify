"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createProduct(data: {
  title: string
  description?: string
  price: number
  compareAtPrice?: number
  costPerItem?: number
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
  vendor?: string
  productType?: string
  tags?: string[]
  images?: string[]
  variants?: {
    title: string
    sku?: string
    price: number
    inventoryQuantity: number
    option1?: string
    option2?: string
    option3?: string
  }[]
}) {
  // Generate slug from title
  let slug = generateSlug(data.title)

  // Check for existing slug and make unique if needed
  const existing = await db.product.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now()}`
  }

  const product = await db.product.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      costPerItem: data.costPerItem,
      status: data.status,
      vendor: data.vendor,
      productType: data.productType,
      tags: data.tags || [],
      images: data.images || [],
      variants: {
        create: data.variants?.length ? data.variants : [{
          title: "Default",
          price: data.price,
          inventoryQuantity: 0
        }]
      }
    }
  })

  revalidatePath("/products")
  revalidatePath("/dashboard")
  return product
}

export async function updateProduct(id: string, data: {
  title?: string
  description?: string
  price?: number
  compareAtPrice?: number | null
  costPerItem?: number | null
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED"
  vendor?: string | null
  productType?: string | null
  tags?: string[]
  images?: string[]
}) {
  const product = await db.product.update({
    where: { id },
    data
  })

  revalidatePath("/products")
  revalidatePath(`/products/${id}`)
  revalidatePath("/dashboard")
  return product
}

export async function deleteProduct(id: string) {
  await db.product.delete({
    where: { id }
  })

  revalidatePath("/products")
  revalidatePath("/dashboard")
}

export async function deleteProducts(ids: string[]) {
  await db.product.deleteMany({
    where: { id: { in: ids } }
  })

  revalidatePath("/products")
  revalidatePath("/dashboard")
}

export async function updateProductStatus(id: string, status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  await db.product.update({
    where: { id },
    data: { status }
  })

  revalidatePath("/products")
  revalidatePath(`/products/${id}`)
}

export async function createVariant(productId: string, data: {
  title: string
  sku?: string
  price: number
  compareAtPrice?: number
  inventoryQuantity: number
  option1?: string
  option2?: string
  option3?: string
}) {
  const variant = await db.variant.create({
    data: {
      productId,
      ...data
    }
  })

  revalidatePath(`/products/${productId}`)
  revalidatePath("/inventory")
  return variant
}

export async function updateVariant(id: string, data: {
  title?: string
  sku?: string
  price?: number
  compareAtPrice?: number | null
  inventoryQuantity?: number
  option1?: string
  option2?: string
  option3?: string
}) {
  const variant = await db.variant.update({
    where: { id },
    data
  })

  revalidatePath("/products")
  revalidatePath("/inventory")
  return variant
}

export async function deleteVariant(id: string) {
  const variant = await db.variant.findUnique({
    where: { id },
    select: { productId: true }
  })

  await db.variant.delete({
    where: { id }
  })

  if (variant) {
    revalidatePath(`/products/${variant.productId}`)
  }
  revalidatePath("/inventory")
}
