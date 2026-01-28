import { NextRequest, NextResponse } from "next/server"
import { getRealtimeStats } from "@/lib/analytics"

export async function GET(request: NextRequest) {
  try {
    const stats = await getRealtimeStats()
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("Realtime analytics error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
