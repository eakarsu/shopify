"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface PricingResult {
  recommended_price: number
  price_band: { min: number; max: number }
  expected_unit_lift_pct: number
  expected_revenue_lift_pct: number
  elasticity_estimate: "elastic" | "inelastic" | "unit"
  rationale: string
  risk_flags: string[]
  confidence: "low" | "medium" | "high"
}

interface PricingResponse {
  productId: string
  windowDays: number
  totals: { totalUnits: number; totalRevenue: number; avgSellingPrice: number }
  result: PricingResult
  aiUsed: boolean
}

/**
 * Dynamic-pricing admin page (apply pass 5).
 * Optional competitor_prices input is collected as a comma-separated list.
 */
export default function DynamicPricingPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id
  const [data, setData] = useState<PricingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<string | null>(null)
  const [competitorPrices, setCompetitorPrices] = useState("")

  async function run() {
    setLoading(true); setError(null); setMissing(null)
    try {
      const competitor_prices = competitorPrices
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => isFinite(n) && n > 0)
      const r = await fetch(`/api/ai/dynamic-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, competitor_prices }),
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
        <h1 className="text-2xl font-bold">Dynamic Pricing</h1>
        <p className="text-muted-foreground text-sm">
          AI-suggested price band based on the last 60 days of internal sales and optional competitor prices.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          className="border rounded px-2 py-1 text-sm flex-1"
          placeholder="Optional competitor prices, comma-separated (e.g. 19.99, 24.50)"
          value={competitorPrices}
          onChange={(e) => setCompetitorPrices(e.target.value)}
        />
        <Button onClick={run} disabled={loading}>
          {loading ? "Analysing…" : data ? "Re-run analysis" : "Run analysis"}
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
              <div className="text-muted-foreground">Units (last {data.windowDays}d)</div>
              <div className="text-lg font-semibold">{data.totals.totalUnits}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Revenue (last {data.windowDays}d)</div>
              <div className="text-lg font-semibold">${data.totals.totalRevenue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg selling price</div>
              <div className="text-lg font-semibold">${data.totals.avgSellingPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Confidence</div>
              <div className="text-lg font-semibold capitalize">{data.result.confidence}</div>
            </div>
          </div>

          <div>
            <div className="font-semibold">Recommended price</div>
            <div className="text-2xl font-bold">${data.result.recommended_price.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">
              Band: ${data.result.price_band.min.toFixed(2)} – ${data.result.price_band.max.toFixed(2)} · Elasticity: {data.result.elasticity_estimate}
            </div>
            <div className="text-sm text-muted-foreground">
              Expected lift — units {data.result.expected_unit_lift_pct}% · revenue {data.result.expected_revenue_lift_pct}%
            </div>
          </div>

          <div className="text-sm">{data.result.rationale}</div>

          {data.result.risk_flags?.length > 0 && (
            <div>
              <div className="font-semibold text-sm">Risk flags</div>
              <ul className="list-disc list-inside text-sm">
                {data.result.risk_flags.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
