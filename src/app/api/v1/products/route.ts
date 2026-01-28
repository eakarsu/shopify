import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey, hasPermission } from "@/lib/api-auth"

// GET /api/v1/products - List products
export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "products:read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 250)
    const cursor = searchParams.get("cursor")
    const status = searchParams.get("status")
    const vendor = searchParams.get("vendor")

    const where: any = {}
    if (status) where.status = status
    if (vendor) where.vendor = vendor

    const products = await prisma.product.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        variants: true,
        collections: { select: { id: true, title: true } }
      }
    })

    const hasMore = products.length > limit
    const items = hasMore ? products.slice(0, -1) : products
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      products: items,
      pagination: {
        hasMore,
        cursor: nextCursor
      }
    })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/v1/products - Create product
export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "products:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, price, compareAtPrice, vendor, productType, tags, status, variants } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Generate handle
    const handle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    const product = await prisma.product.create({
      data: {
        title,
        handle,
        description,
        price: price || 0,
        compareAtPrice,
        vendor,
        productType,
        tags: tags || [],
        status: status || "DRAFT",
        variants: variants ? {
          create: variants.map((v: any, index: number) => ({
            title: v.title || "Default",
            sku: v.sku,
            price: v.price || price || 0,
            compareAtPrice: v.compareAtPrice,
            inventoryQuantity: v.inventoryQuantity || 0,
            position: index + 1
          }))
        } : {
          create: {
            title: "Default",
            price: price || 0,
            inventoryQuantity: 0,
            position: 1
          }
        }
      },
      include: { variants: true }
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
