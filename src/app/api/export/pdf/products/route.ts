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

    const products = await prisma.product.findMany({
      include: { variants: true },
      orderBy: { createdAt: "desc" }
    })

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Products Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { font-size: 24px; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f5f5f5; text-align: left; padding: 10px 8px; border-bottom: 2px solid #ddd; font-weight: 600; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
          tr:hover { background: #fafafa; }
          .status { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
          .status-active { background: #dcfce7; color: #166534; }
          .status-draft { background: #f3f4f6; color: #374151; }
          .status-archived { background: #fef3c7; color: #92400e; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Products Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleDateString()} - ${products.length} products</p>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Price</th>
              <th>Vendor</th>
              <th>Type</th>
              <th>Inventory</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><strong>${p.title}</strong></td>
                <td><span class="status status-${p.status.toLowerCase()}">${p.status}</span></td>
                <td>$${Number(p.price).toFixed(2)}</td>
                <td>${p.vendor || "-"}</td>
                <td>${p.productType || "-"}</td>
                <td>${p.variants.reduce((s, v) => s + v.inventoryQuantity, 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="footer">ShopifyClone - Products Report</div>
      </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="products-report-${new Date().toISOString().split("T")[0]}.html"`
      }
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
