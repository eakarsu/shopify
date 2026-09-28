import { NextResponse } from "next/server"

export async function GET() {
  if (process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const email = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || ""
  const password = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || ""
  if (!email || !password) {
    return NextResponse.json({ error: "Demo credentials unavailable" }, { status: 503 })
  }
  return NextResponse.json({ email, password }, { headers: { "cache-control": "no-store" } })
}
