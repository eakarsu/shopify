import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const products = await prisma.product.findMany({
      include: { variants: true },
      orderBy: { createdAt: "desc" }
    })

    const headers = ["ID", "Title", "Status", "Price", "Compare At Price", "Vendor", "Type", "Tags", "SKU", "Inventory", "Created At"]
    const rows = products.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.status,
      Number(p.price).toFixed(2),
      p.compareAtPrice ? Number(p.compareAtPrice).toFixed(2) : "",
      p.vendor || "",
      p.productType || "",
      `"${p.tags.join(", ")}"`,
      p.variants[0]?.sku || "",
      p.variants.reduce((sum, v) => sum + v.inventoryQuantity, 0),
      new Date(p.createdAt).toISOString()
    ])

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="products-${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("CSV export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
