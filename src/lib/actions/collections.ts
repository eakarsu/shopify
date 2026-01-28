"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createCollection(data: {
  title: string
  description?: string
  image?: string
  type?: "MANUAL" | "AUTOMATED"
  rules?: any
  published?: boolean
}) {
  // Generate slug from title
  let slug = generateSlug(data.title)

  // Check for existing slug and make unique if needed
  const existing = await db.collection.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now()}`
  }

  const collection = await db.collection.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      image: data.image,
      type: data.type || "MANUAL",
      rules: data.rules,
      published: data.published ?? true
    }
  })

  revalidatePath("/collections")
  return collection
}

export async function updateCollection(id: string, data: {
  title?: string
  description?: string | null
  image?: string | null
  type?: "MANUAL" | "AUTOMATED"
  rules?: any
  sortOrder?: string
  published?: boolean
}) {
  const collection = await db.collection.update({
    where: { id },
    data
  })

  revalidatePath("/collections")
  return collection
}

export async function deleteCollection(id: string) {
  await db.collection.delete({
    where: { id }
  })

  revalidatePath("/collections")
}

export async function deleteCollections(ids: string[]) {
  await db.collection.deleteMany({
    where: { id: { in: ids } }
  })

  revalidatePath("/collections")
}

export async function addProductToCollection(collectionId: string, productId: string) {
  // Check if already exists
  const existing = await db.collectionProduct.findUnique({
    where: {
      collectionId_productId: {
        collectionId,
        productId
      }
    }
  })

  if (existing) {
    return existing
  }

  // Get max position
  const maxPosition = await db.collectionProduct.aggregate({
    where: { collectionId },
    _max: { position: true }
  })

  const collectionProduct = await db.collectionProduct.create({
    data: {
      collectionId,
      productId,
      position: (maxPosition._max.position || 0) + 1
    }
  })

  revalidatePath("/collections")
  revalidatePath(`/products/${productId}`)
  return collectionProduct
}

export async function removeProductFromCollection(collectionId: string, productId: string) {
  await db.collectionProduct.delete({
    where: {
      collectionId_productId: {
        collectionId,
        productId
      }
    }
  })

  revalidatePath("/collections")
  revalidatePath(`/products/${productId}`)
}

export async function addProductsToCollection(collectionId: string, productIds: string[]) {
  const maxPosition = await db.collectionProduct.aggregate({
    where: { collectionId },
    _max: { position: true }
  })

  let position = (maxPosition._max.position || 0) + 1

  for (const productId of productIds) {
    const existing = await db.collectionProduct.findUnique({
      where: {
        collectionId_productId: {
          collectionId,
          productId
        }
      }
    })

    if (!existing) {
      await db.collectionProduct.create({
        data: {
          collectionId,
          productId,
          position: position++
        }
      })
    }
  }

  revalidatePath("/collections")
}

export async function removeProductsFromCollection(collectionId: string, productIds: string[]) {
  await db.collectionProduct.deleteMany({
    where: {
      collectionId,
      productId: { in: productIds }
    }
  })

  revalidatePath("/collections")
}

export async function reorderCollectionProducts(collectionId: string, productIds: string[]) {
  for (let i = 0; i < productIds.length; i++) {
    await db.collectionProduct.update({
      where: {
        collectionId_productId: {
          collectionId,
          productId: productIds[i]
        }
      },
      data: { position: i }
    })
  }

  revalidatePath("/collections")
}

export async function toggleCollectionPublished(id: string) {
  const collection = await db.collection.findUnique({
    where: { id },
    select: { published: true }
  })

  if (!collection) {
    throw new Error("Collection not found")
  }

  await db.collection.update({
    where: { id },
    data: { published: !collection.published }
  })

  revalidatePath("/collections")
}
