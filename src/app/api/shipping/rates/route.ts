import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error: "Standalone shipping estimates are disabled. Use /api/order-operations/quote so carrier and tax quotes share one expiring checkout snapshot.",
      code: "UNSAFE_QUOTE_PATH_DISABLED",
    },
    { status: 410 },
  )
}
