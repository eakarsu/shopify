"use client"

import { useEffect, useState } from "react"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface AIResultRow {
  id: string
  feature: string
  productId?: string
  model: string
  latencyMs?: number
  cacheHit: boolean
  ai_results: any
  error?: string
  createdAt: string
}

/**
 * Admin AI Results page — paginated audit log for every AI call.
 * Filters by feature. Shows per-call latency, model, cache-hit, error.
 */
export default function AIResultsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [feature, setFeature] = useState("")
  const [data, setData] = useState<{ data: AIResultRow[]; pagination: any }>({
    data: [],
    pagination: { totalPages: 1, total: 0 }
  })
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (feature) params.set("feature", feature)
      const r = await fetch(`/api/ai/results?${params}`)
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || "Failed")
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const r = await fetch("/api/ai/stats")
      if (r.ok) setStats(await r.json())
    } catch {}
  }

  useEffect(() => { load(); loadStats() /* eslint-disable-next-line */ }, [page, feature])

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Call History</h1>
        <p className="text-muted-foreground text-sm">
          Every AI call is logged to ai_results JSONB for cost telemetry and debugging.
        </p>
      </div>

      {stats && (
        <Card className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Requests (process)</div>
            <div className="text-lg font-semibold">{stats.inMemory?.requests ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Cache hits</div>
            <div className="text-lg font-semibold">{stats.inMemory?.cacheHits ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Errors (process)</div>
            <div className="text-lg font-semibold">{stats.inMemory?.errors ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Last 24h (DB)</div>
            <div className="text-lg font-semibold">{stats.persisted?.last24h ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Total errors (DB)</div>
            <div className="text-lg font-semibold">{stats.persisted?.totalErrors ?? 0}</div>
          </div>
        </Card>
      )}

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Filter by feature (e.g. generate_description)"
          value={feature}
          onChange={(e) => { setFeature(e.target.value); setPage(1) }}
          className="max-w-md"
        />
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-2">
        {data.data.length === 0 && !loading && (
          <Card className="p-8 text-center text-muted-foreground">No AI results yet.</Card>
        )}
        {data.data.map(row => (
          <Card key={row.id} className="p-3">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{row.feature}</Badge>
                  {row.error && <Badge variant="destructive">error</Badge>}
                  {row.cacheHit && <Badge variant="secondary">cache</Badge>}
                  <code className="text-xs">{row.model}</code>
                  <span className="text-xs text-muted-foreground">
                    {row.latencyMs ?? "?"}ms • {new Date(row.createdAt).toLocaleString()}
                  </span>
                </div>
                {row.error ? (
                  <p className="text-xs text-red-600 line-clamp-2">{row.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {Object.keys(row.ai_results || {}).slice(0, 6).join(", ") || "(empty)"}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <span className="text-sm text-muted-foreground">{data.pagination.total} total</span>
        <Pagination page={page} totalPages={data.pagination.totalPages || 1} onPageChange={setPage} />
      </div>
    </div>
  )
}
