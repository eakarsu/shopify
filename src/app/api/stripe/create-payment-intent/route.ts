import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error: "Direct payment-intent creation is disabled. Create an inventory-backed order through /api/order-operations/checkout.",
      code: "UNSAFE_PAYMENT_PATH_DISABLED",
    },
    { status: 410 },
  )
}
