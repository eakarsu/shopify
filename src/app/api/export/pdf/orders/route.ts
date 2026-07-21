import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"

function buildOrdersPDF(orders: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0)
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text("Orders Report", { align: "left" })
    doc.fontSize(10).font("Helvetica").fillColor("#666666")
      .text(`Generated on ${dateStr} — ${orders.length} orders`, { align: "left" })
    doc.moveDown(0.5)

    // Summary cards
    doc.fillColor("#000000").fontSize(10).font("Helvetica-Bold")
    const summaryY = doc.y
    const cardW = (doc.page.width - 80) / 3
    const cardData = [
      { label: "Total Orders", value: String(orders.length) },
      { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}` },
      { label: "Avg Order Value", value: `$${orders.length ? (totalRevenue / orders.length).toFixed(2) : "0.00"}` }
    ]

    cardData.forEach((card, i) => {
      const x = 40 + i * (cardW + 10)
      doc.rect(x, summaryY, cardW, 50).fillAndStroke("#f9fafb", "#e5e7eb")
      doc.fillColor("#6b7280").fontSize(8).font("Helvetica")
        .text(card.label.toUpperCase(), x + 10, summaryY + 8, { width: cardW - 20 })
      doc.fillColor("#111827").fontSize(14).font("Helvetica-Bold")
        .text(card.value, x + 10, summaryY + 22, { width: cardW - 20 })
    })

    doc.y = summaryY + 65
    doc.moveDown(0.5)

    // Table header
    const tableTop = doc.y
    const cols = [
      { label: "Order #", x: 40, w: 60 },
      { label: "Date", x: 105, w: 70 },
      { label: "Customer", x: 180, w: 110 },
      { label: "Payment", x: 295, w: 80 },
      { label: "Fulfillment", x: 380, w: 80 },
      { label: "Total", x: 465, w: 70 }
    ]

    doc.rect(40, tableTop, doc.page.width - 80, 20).fill("#f5f5f5")
    doc.fillColor("#374151").fontSize(8).font("Helvetica-Bold")
    cols.forEach(col => {
      doc.text(col.label, col.x, tableTop + 6, { width: col.w })
    })

    let rowY = tableTop + 22
    doc.fillColor("#000000").fontSize(8).font("Helvetica")

    orders.forEach((order, idx) => {
      if (rowY > doc.page.height - 80) {
        doc.addPage()
        rowY = 40
      }

      if (idx % 2 === 0) {
        doc.rect(40, rowY - 2, doc.page.width - 80, 16).fill("#fafafa")
      }

      doc.fillColor("#111827")
      const customerName = order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : order.email || ""

      doc.text(`#${order.orderNumber}`, cols[0].x, rowY, { width: cols[0].w })
      doc.text(new Date(order.createdAt).toLocaleDateString(), cols[1].x, rowY, { width: cols[1].w })
      doc.text(customerName.slice(0, 20), cols[2].x, rowY, { width: cols[2].w })
      doc.text(order.financialStatus, cols[3].x, rowY, { width: cols[3].w })
      doc.text(order.fulfillmentStatus, cols[4].x, rowY, { width: cols[4].w })
      doc.font("Helvetica-Bold").text(`$${Number(order.totalPrice).toFixed(2)}`, cols[5].x, rowY, { width: cols[5].w })
      doc.font("Helvetica")

      // Row separator
      doc.moveTo(40, rowY + 14).lineTo(doc.page.width - 40, rowY + 14).stroke("#eeeeee")
      rowY += 16
    })

    // Footer
    doc.moveDown(2)
    doc.fontSize(9).fillColor("#999999")
      .text("ShopifyClone — Orders Report", 40, doc.page.height - 50, {
        width: doc.page.width - 80,
        align: "center"
      })

    doc.end()
  })
}

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

    const pdfBuffer = await buildOrdersPDF(orders)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="orders-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Content-Length": String(pdfBuffer.length)
      }
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
