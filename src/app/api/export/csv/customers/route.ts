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

    const customers = await prisma.customer.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" }
    })

    const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Company", "Address", "City", "State", "Postal Code", "Country", "Orders", "Total Spent", "Accepts Marketing", "Created At"]
    const rows = customers.map(c => [
      c.id,
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      c.email,
      c.phone || "",
      c.company ? `"${c.company}"` : "",
      c.address1 ? `"${c.address1}"` : "",
      c.city || "",
      c.state || "",
      c.postalCode || "",
      c.country || "",
      c._count.orders,
      Number(c.totalSpent).toFixed(2),
      c.acceptsMarketing ? "Yes" : "No",
      new Date(c.createdAt).toISOString()
    ])

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("CSV export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
