"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ShoppingCart, Eye, TrendingUp } from "lucide-react"

interface RealtimeStats {
  activeVisitors: number
  recentOrders: number
  recentPageViews: number
}

export default function RealtimeAnalyticsPage() {
  const [stats, setStats] = useState<RealtimeStats>({
    activeVisitors: 0,
    recentOrders: 0,
    recentPageViews: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/analytics/realtime")
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error("Failed to fetch realtime stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Realtime Analytics</h1>
          <p className="text-muted-foreground">
            Live activity in the last 15 minutes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {loading ? "..." : stats.activeVisitors}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently browsing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {loading ? "..." : stats.recentOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In the last 15 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {loading ? "..." : stats.recentPageViews}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In the last 15 minutes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Activity tracking is active.</p>
            <p className="text-sm mt-2">
              Events will appear here as visitors browse your store.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
