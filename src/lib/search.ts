import { prisma } from "./prisma"

export interface SearchResult {
  products: {
    id: string
    title: string
    handle: string
    price: number
    image?: string
    category?: string
  }[]
  collections: {
    id: string
    title: string
    handle: string
    productCount: number
  }[]
  totalProducts: number
  totalCollections: number
}

export async function searchProducts(
  query: string,
  options: {
    limit?: number
    offset?: number
    category?: string
    minPrice?: number
    maxPrice?: number
    sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "bestselling"
  } = {}
): Promise<SearchResult> {
  const { limit = 20, offset = 0, category, minPrice, maxPrice, sortBy = "relevance" } = options

  // Build search terms for full-text search
  const searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2)

  // Build where clause
  const where: any = {
    status: "ACTIVE",
    AND: searchTerms.map(term => ({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { vendor: { contains: term, mode: "insensitive" } },
        { productType: { contains: term, mode: "insensitive" } },
        { tags: { has: term } },
      ]
    }))
  }

  // Add price filters
  if (minPrice !== undefined) {
    where.price = { ...where.price, gte: minPrice }
  }
  if (maxPrice !== undefined) {
    where.price = { ...where.price, lte: maxPrice }
  }

  // Build order by
  let orderBy: any = {}
  switch (sortBy) {
    case "price_asc":
      orderBy = { price: "asc" }
      break
    case "price_desc":
      orderBy = { price: "desc" }
      break
    case "newest":
      orderBy = { createdAt: "desc" }
      break
    case "bestselling":
      orderBy = { salesCount: "desc" }
      break
    default:
      orderBy = { updatedAt: "desc" }
  }

  // Execute product search
  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        title: true,
        handle: true,
        price: true,
        images: true,
        productType: true,
      },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.product.count({ where })
  ])

  // Search collections
  const collectionWhere = {
    OR: searchTerms.map(term => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
      ]
    }))
  }

  const [collections, totalCollections] = await Promise.all([
    prisma.collection.findMany({
      where: collectionWhere,
      select: {
        id: true,
        title: true,
        handle: true,
        products: { select: { id: true } },
      },
      take: 5,
    }),
    prisma.collection.count({ where: collectionWhere })
  ])

  return {
    products: products.map(p => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      price: Number(p.price),
      image: (p.images as any)?.[0]?.url,
      category: p.productType || undefined,
    })),
    collections: collections.map(c => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      productCount: c.products.length,
    })),
    totalProducts,
    totalCollections,
  }
}

export async function getSuggestions(query: string, limit: number = 10): Promise<string[]> {
  if (query.length < 2) return []

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { productType: { contains: query, mode: "insensitive" } },
      ]
    },
    select: { title: true, productType: true },
    take: limit,
    distinct: ["title"],
  })

  const suggestions = new Set<string>()

  products.forEach(p => {
    if (p.title.toLowerCase().includes(query.toLowerCase())) {
      suggestions.add(p.title)
    }
    if (p.productType?.toLowerCase().includes(query.toLowerCase())) {
      suggestions.add(p.productType)
    }
  })

  return Array.from(suggestions).slice(0, limit)
}

export async function getPopularSearches(): Promise<string[]> {
  // Get popular product types and categories
  const products = await prisma.product.groupBy({
    by: ["productType"],
    where: { status: "ACTIVE", productType: { not: null } },
    _count: { productType: true },
    orderBy: { _count: { productType: "desc" } },
    take: 10,
  })

  return products
    .filter(p => p.productType)
    .map(p => p.productType as string)
}
