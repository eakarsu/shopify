import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey, hasPermission } from "@/lib/api-auth"

// GET /api/v1/products/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "products:read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
        collections: { select: { id: true, title: true } }
      }
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/v1/products/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "products:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, price, compareAtPrice, vendor, productType, tags, status, images } = body

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(compareAtPrice !== undefined && { compareAtPrice }),
        ...(vendor !== undefined && { vendor }),
        ...(productType !== undefined && { productType }),
        ...(tags !== undefined && { tags }),
        ...(status !== undefined && { status }),
        ...(images !== undefined && { images })
      },
      include: { variants: true }
    })

    return NextResponse.json({ product })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/v1/products/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "products:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Delete variants first
    await prisma.variant.deleteMany({
      where: { productId: params.id }
    })

    await prisma.product.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
