import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey, hasPermission } from "@/lib/api-auth"

// GET /api/v1/inventory - List inventory levels
export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "inventory:read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 250)
    const cursor = searchParams.get("cursor")
    const locationId = searchParams.get("location_id")
    const variantId = searchParams.get("variant_id")

    const where: any = {}
    if (locationId) where.locationId = locationId
    if (variantId) where.variantId = variantId

    const inventory = await prisma.inventory.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        variant: {
          include: {
            product: { select: { id: true, title: true, handle: true } }
          }
        },
        location: { select: { id: true, name: true } }
      }
    })

    const hasMore = inventory.length > limit
    const items = hasMore ? inventory.slice(0, -1) : inventory
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      inventory: items,
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

// POST /api/v1/inventory/adjust - Adjust inventory
export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "inventory:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { variantId, locationId, adjustment, reason } = body

    if (!variantId || !locationId || adjustment === undefined) {
      return NextResponse.json({
        error: "variantId, locationId, and adjustment are required"
      }, { status: 400 })
    }

    // Find or create inventory record
    let inventory = await prisma.inventory.findFirst({
      where: { variantId, locationId }
    })

    if (!inventory) {
      inventory = await prisma.inventory.create({
        data: {
          variantId,
          locationId,
          quantity: 0
        }
      })
    }

    const newQuantity = inventory.quantity + adjustment

    if (newQuantity < 0) {
      return NextResponse.json({
        error: "Insufficient inventory"
      }, { status: 400 })
    }

    // Update inventory
    const updated = await prisma.inventory.update({
      where: { id: inventory.id },
      data: { quantity: newQuantity }
    })

    // Also update variant's inventoryQuantity (aggregate)
    const totalInventory = await prisma.inventory.aggregate({
      where: { variantId },
      _sum: { quantity: true }
    })

    await prisma.variant.update({
      where: { id: variantId },
      data: { inventoryQuantity: totalInventory._sum.quantity || 0 }
    })

    return NextResponse.json({
      inventory: updated,
      previousQuantity: inventory.quantity,
      adjustment,
      newQuantity
    })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
