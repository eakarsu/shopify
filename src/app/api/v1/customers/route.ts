import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey, hasPermission } from "@/lib/api-auth"

// GET /api/v1/customers - List customers
export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "customers:read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 250)
    const cursor = searchParams.get("cursor")
    const email = searchParams.get("email")
    const query = searchParams.get("query")

    const where: any = {}
    if (email) where.email = email
    if (query) {
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } }
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        totalOrders: true,
        totalSpent: true,
        acceptsMarketing: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const hasMore = customers.length > limit
    const items = hasMore ? customers.slice(0, -1) : customers
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      customers: items,
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

// POST /api/v1/customers - Create customer
export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!hasPermission(auth.apiKey, "customers:write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, phone, acceptsMarketing, tags, note, addresses } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json({ error: "Customer with this email already exists" }, { status: 409 })
    }

    const customer = await prisma.customer.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        acceptsMarketing: acceptsMarketing ?? false,
        tags: tags || [],
        notes: note,
        addresses: addresses ? { create: addresses.map((addr: any, index: number) => ({ phone: addr.phone, isDefault: index === 0 })) } : undefined
      },
      include: { addresses: true }
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
