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

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orders Report</title>
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
          .status { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
          .paid { background: #dcfce7; color: #166534; }
          .pending { background: #fef3c7; color: #92400e; }
          .refunded { background: #f3f4f6; color: #374151; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Orders Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleDateString()} - ${orders.length} orders</p>
        <div class="summary">
          <div class="summary-card"><h3>Total Orders</h3><p>${orders.length}</p></div>
          <div class="summary-card"><h3>Total Revenue</h3><p>$${totalRevenue.toFixed(2)}</p></div>
          <div class="summary-card"><h3>Avg Order Value</h3><p>$${orders.length ? (totalRevenue / orders.length).toFixed(2) : "0.00"}</p></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Payment</th>
              <th>Fulfillment</th>
              <th>Items</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>#${o.orderNumber}</strong></td>
                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                <td>${o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : o.email}</td>
                <td><span class="status ${o.financialStatus.toLowerCase()}">${o.financialStatus}</span></td>
                <td>${o.fulfillmentStatus}</td>
                <td>${o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td><strong>$${Number(o.totalPrice).toFixed(2)}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="footer">ShopifyClone - Orders Report</div>
      </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="orders-report-${new Date().toISOString().split("T")[0]}.html"`
      }
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
