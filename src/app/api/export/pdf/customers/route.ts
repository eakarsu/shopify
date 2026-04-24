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

    const customers = await prisma.customer.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" }
    })

    const totalSpent = customers.reduce((sum, c) => sum + Number(c.totalSpent), 0)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customers Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; }
          .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; flex: 1; }
          .summary-card h3 { font-size: 12px; color: #6b7280; margin: 0 0 5px 0; text-transform: uppercase; }
          .summary-card p { font-size: 20px; font-weight: 700; margin: 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f5f5f5; text-align: left; padding: 10px 8px; border-bottom: 2px solid #ddd; font-weight: 600; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Customers Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleDateString()} - ${customers.length} customers</p>
        <div class="summary">
          <div class="summary-card"><h3>Total Customers</h3><p>${customers.length}</p></div>
          <div class="summary-card"><h3>Total Revenue</h3><p>$${totalSpent.toFixed(2)}</p></div>
          <div class="summary-card"><h3>Avg Lifetime Value</h3><p>$${customers.length ? (totalSpent / customers.length).toFixed(2) : "0.00"}</p></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Location</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Marketing</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr>
                <td><strong>${c.firstName} ${c.lastName}</strong></td>
                <td>${c.email}</td>
                <td>${c.city ? `${c.city}, ${c.state}` : "-"}</td>
                <td>${c._count.orders}</td>
                <td>$${Number(c.totalSpent).toFixed(2)}</td>
                <td>${c.acceptsMarketing ? "Yes" : "No"}</td>
                <td>${new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="footer">ShopifyClone - Customers Report</div>
      </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="customers-report-${new Date().toISOString().split("T")[0]}.html"`
      }
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
