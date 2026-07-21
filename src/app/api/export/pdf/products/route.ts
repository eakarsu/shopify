import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"

function buildProductsPDF(products: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text("Products Report", { align: "left" })
    doc.fontSize(10).font("Helvetica").fillColor("#666666")
      .text(`Generated on ${dateStr} — ${products.length} products`, { align: "left" })
    doc.moveDown(1)

    // Table header
    const tableTop = doc.y
    const cols = [
      { label: "Product", x: 40, w: 170 },
      { label: "Status", x: 215, w: 70 },
      { label: "Price", x: 290, w: 70 },
      { label: "Vendor", x: 365, w: 80 },
      { label: "Type", x: 450, w: 70 },
      { label: "Inventory", x: 525, w: 55 }
    ]

    doc.rect(40, tableTop, doc.page.width - 80, 20).fill("#f5f5f5")
    doc.fillColor("#374151").fontSize(8).font("Helvetica-Bold")
    cols.forEach(col => {
      doc.text(col.label, col.x, tableTop + 6, { width: col.w })
    })

    let rowY = tableTop + 22
    doc.fillColor("#000000").fontSize(8).font("Helvetica")

    products.forEach((product, idx) => {
      if (rowY > doc.page.height - 80) {
        doc.addPage()
        rowY = 40
      }

      if (idx % 2 === 0) {
        doc.rect(40, rowY - 2, doc.page.width - 80, 16).fill("#fafafa")
      }

      const totalInventory = product.variants.reduce(
        (sum: number, v: any) => sum + v.inventoryQuantity, 0
      )

      doc.fillColor("#111827")
      doc.font("Helvetica-Bold").text(product.title.slice(0, 28), cols[0].x, rowY, { width: cols[0].w })
      doc.font("Helvetica")
      doc.text(product.status, cols[1].x, rowY, { width: cols[1].w })
      doc.text(`$${Number(product.price).toFixed(2)}`, cols[2].x, rowY, { width: cols[2].w })
      doc.text((product.vendor || "-").slice(0, 14), cols[3].x, rowY, { width: cols[3].w })
      doc.text((product.productType || "-").slice(0, 12), cols[4].x, rowY, { width: cols[4].w })
      doc.text(String(totalInventory), cols[5].x, rowY, { width: cols[5].w })

      doc.moveTo(40, rowY + 14).lineTo(doc.page.width - 40, rowY + 14).stroke("#eeeeee")
      rowY += 16
    })

    // Footer
    doc.fontSize(9).fillColor("#999999")
      .text("ShopifyClone — Products Report", 40, doc.page.height - 50, {
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

    const products = await prisma.product.findMany({
      include: { variants: true },
      orderBy: { createdAt: "desc" }
    })

    const pdfBuffer = await buildProductsPDF(products)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="products-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Content-Length": String(pdfBuffer.length)
      }
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
