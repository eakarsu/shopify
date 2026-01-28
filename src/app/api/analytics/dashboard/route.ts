import { NextRequest, NextResponse } from "next/server"
import { getDashboardStats, getConversionFunnel, getSalesChart } from "@/lib/analytics"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get("period") || "week") as "today" | "week" | "month" | "year"

    const [stats, funnel, chart] = await Promise.all([
      getDashboardStats(period),
      getConversionFunnel(period === "year" ? "month" : period),
      getSalesChart(period === "today" ? "week" : period)
    ])

    return NextResponse.json({
      stats,
      funnel,
      chart
    })
  } catch (error: any) {
    console.error("Dashboard analytics error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
