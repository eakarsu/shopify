import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"

function buildCustomersPDF(customers: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const totalSpent = customers.reduce((sum, c) => sum + Number(c.totalSpent), 0)
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text("Customers Report", { align: "left" })
    doc.fontSize(10).font("Helvetica").fillColor("#666666")
      .text(`Generated on ${dateStr} — ${customers.length} customers`, { align: "left" })
    doc.moveDown(0.5)

    // Summary
    const summaryY = doc.y
    const cardW = (doc.page.width - 80) / 3
    const cardData = [
      { label: "Total Customers", value: String(customers.length) },
      { label: "Total Revenue", value: `$${totalSpent.toFixed(2)}` },
      { label: "Avg Lifetime Value", value: `$${customers.length ? (totalSpent / customers.length).toFixed(2) : "0.00"}` }
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
      { label: "Name", x: 40, w: 110 },
      { label: "Email", x: 155, w: 130 },
      { label: "Location", x: 290, w: 90 },
      { label: "Orders", x: 385, w: 45 },
      { label: "Spent", x: 435, w: 70 },
      { label: "Joined", x: 510, w: 65 }
    ]

    doc.rect(40, tableTop, doc.page.width - 80, 20).fill("#f5f5f5")
    doc.fillColor("#374151").fontSize(8).font("Helvetica-Bold")
    cols.forEach(col => {
      doc.text(col.label, col.x, tableTop + 6, { width: col.w })
    })

    let rowY = tableTop + 22
    doc.fillColor("#000000").fontSize(8).font("Helvetica")

    customers.forEach((customer, idx) => {
      if (rowY > doc.page.height - 80) {
        doc.addPage()
        rowY = 40
      }

      if (idx % 2 === 0) {
        doc.rect(40, rowY - 2, doc.page.width - 80, 16).fill("#fafafa")
      }

      const location = customer.city
        ? `${customer.city}${customer.state ? ", " + customer.state : ""}`
        : "-"

      doc.fillColor("#111827")
      doc.font("Helvetica-Bold")
        .text(`${customer.firstName} ${customer.lastName}`.slice(0, 18), cols[0].x, rowY, { width: cols[0].w })
      doc.font("Helvetica")
        .text(customer.email.slice(0, 22), cols[1].x, rowY, { width: cols[1].w })
        .text(location.slice(0, 16), cols[2].x, rowY, { width: cols[2].w })
        .text(String(customer._count.orders), cols[3].x, rowY, { width: cols[3].w })
        .text(`$${Number(customer.totalSpent).toFixed(2)}`, cols[4].x, rowY, { width: cols[4].w })
        .text(new Date(customer.createdAt).toLocaleDateString(), cols[5].x, rowY, { width: cols[5].w })

      doc.moveTo(40, rowY + 14).lineTo(doc.page.width - 40, rowY + 14).stroke("#eeeeee")
      rowY += 16
    })

    // Footer
    doc.fontSize(9).fillColor("#999999")
      .text("ShopifyClone — Customers Report", 40, doc.page.height - 50, {
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

    const customers = await prisma.customer.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" }
    })

    const pdfBuffer = await buildCustomersPDF(customers)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="customers-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Content-Length": String(pdfBuffer.length)
      }
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
