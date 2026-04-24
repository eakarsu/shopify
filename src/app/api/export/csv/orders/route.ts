import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" }
    })

    const headers = ["Order Number", "Date", "Customer", "Email", "Status", "Financial Status", "Fulfillment", "Items", "Subtotal", "Tax", "Shipping", "Discounts", "Total", "Payment Method", "Shipping City", "Shipping State"]
    const rows = orders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      o.customer ? `"${o.customer.firstName} ${o.customer.lastName}"` : "",
      o.email,
      o.status,
      o.financialStatus,
      o.fulfillmentStatus,
      o.items.reduce((sum, i) => sum + i.quantity, 0),
      Number(o.subtotalPrice).toFixed(2),
      Number(o.totalTax).toFixed(2),
      Number(o.totalShipping).toFixed(2),
      Number(o.totalDiscounts).toFixed(2),
      Number(o.totalPrice).toFixed(2),
      o.paymentMethod || "",
      o.shippingCity || "",
      o.shippingState || ""
    ])

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("CSV export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
