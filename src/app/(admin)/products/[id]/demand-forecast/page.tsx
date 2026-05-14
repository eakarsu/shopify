"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ReorderRecommendation {
  suggest_reorder: boolean
  reorder_quantity: number
  rationale: string
}

interface ForecastResult {
  expected_units_next_30d: number
  low_estimate: number
  high_estimate: number
  trend: "up" | "flat" | "down"
  seasonality_notes: string[]
  reorder_recommendation: ReorderRecommendation
  confidence: "low" | "medium" | "high"
}

interface ForecastResponse {
  productId: string
  historyDays: number
  forecastHorizonDays: number
  totals: { unitsLastWindow: number; dailyAvg: number; onHand: number }
  result: ForecastResult
  aiUsed: boolean
}

/**
 * Demand-forecast admin page (apply pass 5).
 * Mirrors review-sentiment / recommendations pages — admin-gated POST that
 * surfaces a 503 banner when OPENROUTER_API_KEY is unset.
 */
export default function DemandForecastPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<string | null>(null)

  async function run() {
    setLoading(true); setError(null); setMissing(null)
    try {
      const r = await fetch(`/api/ai/demand-forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })
      const json = await r.json()
      if (r.status === 503) {
        setMissing(json?.missing || "OPENROUTER_API_KEY")
        return
      }
      if (!r.ok) throw new Error(json.error || "Failed")
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Demand Forecast &amp; Auto-Reorder</h1>
        <p className="text-muted-foreground text-sm">
          AI-driven 30-day demand forecast and reorder recommendation based on the last 90 days of orders.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={loading}>
          {loading ? "Forecasting…" : data ? "Re-run forecast" : "Run forecast"}
        </Button>
      </div>

      {missing && (
        <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          AI service not configured — missing env var: <code>{missing}</code>
        </div>
      )}
      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Units (last {data.historyDays}d)</div>
              <div className="text-lg font-semibold">{data.totals.unitsLastWindow}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Daily avg</div>
              <div className="text-lg font-semibold">{data.totals.dailyAvg.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">On hand</div>
              <div className="text-lg font-semibold">{data.totals.onHand}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Confidence</div>
              <div className="text-lg font-semibold capitalize">{data.result.confidence}</div>
            </div>
          </div>

          <div>
            <div className="font-semibold">Expected units next {data.forecastHorizonDays}d</div>
            <div className="text-2xl font-bold">{data.result.expected_units_next_30d}</div>
            <div className="text-sm text-muted-foreground">
              Range: {data.result.low_estimate} – {data.result.high_estimate} · Trend: {data.result.trend}
            </div>
          </div>

          <div className="rounded border p-3">
            <div className="font-semibold">Reorder recommendation</div>
            <div className="text-sm">
              {data.result.reorder_recommendation.suggest_reorder
                ? `Reorder ${data.result.reorder_recommendation.reorder_quantity} units`
                : "No reorder needed."}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{data.result.reorder_recommendation.rationale}</div>
          </div>

          {data.result.seasonality_notes?.length > 0 && (
            <div>
              <div className="font-semibold text-sm">Seasonality notes</div>
              <ul className="list-disc list-inside text-sm">
                {data.result.seasonality_notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
