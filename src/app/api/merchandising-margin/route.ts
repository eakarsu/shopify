import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const products = Array.isArray(body.products)
    ? body.products
    : [
        { title: "Linen shirt", price: 68, cost: 29, discountPct: 15, inventoryDays: 44 },
        { title: "Canvas tote", price: 32, cost: 12, discountPct: 5, inventoryDays: 12 },
      ];
  const scored = products.map((product: any) => {
    const price = Number(product.price || 0);
    const net = price * (1 - Number(product.discountPct || 0) / 100);
    const margin = net ? ((net - Number(product.cost || 0)) / net) * 100 : 0;
    return {
      title: product.title || "Product",
      margin: Number(margin.toFixed(1)),
      action: margin < 35 ? "pull discount or bundle with high-margin add-on" : Number(product.inventoryDays || 0) > 35 ? "use controlled markdown" : "keep merchandising plan",
    };
  });
  return NextResponse.json({ scored, lowMarginCount: scored.filter((row) => row.margin < 35).length });
}
