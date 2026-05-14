"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RankedRecommendation {
  productId: string
  title: string
  reason: string
  fit_score: number
}

interface RecommendationsResult {
  recommendations: RankedRecommendation[]
  customer_persona: string
  cross_sell_themes: string[]
  upsell_themes: string[]
  notes: string[]
}

interface RecommendationsResponse {
  customerId: string
  result: RecommendationsResult
  aiUsed: boolean
}

/**
 * AI Customer Recommendations admin page.
 * - On-demand POST to /api/ai/recommendations/[customerId].
 * - Surfaces ranked product recommendations with rationale and themes.
 * - Handles 503 (no API key) explicitly.
 */
export default function CustomerRecommendationsPage() {
  const params = useParams<{ id: string }>()
  const customerId = params.id
  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unconfigured, setUnconfigured] = useState(false)

  async function run() {
    setLoading(true); setError(null); setUnconfigured(false)
    try {
      const r = await fetch(`/api/ai/recommendations/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      const json = await r.json()
      if (r.status === 503) {
        setUnconfigured(true)
        throw new Error(json.error || "AI service not configured")
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
        <h1 className="text-2xl font-bold">AI Recommendations</h1>
        <p className="text-muted-foreground text-sm">
          Generate personalized product recommendations for this customer using
          their purchase history, active cart, and the live catalog.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={loading}>
          {loading ? "Generating…" : data ? "Re-run recommendations" : "Generate recommendations"}
        </Button>
      </div>

      {unconfigured && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          AI service not configured. Set <code>OPENROUTER_API_KEY</code> to enable AI recommendations.
        </div>
      )}

      {error && !unconfigured && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!data && !loading && !error && (
        <Card className="p-8 text-center text-muted-foreground">
          Click &quot;Generate recommendations&quot; to produce a ranked list for this customer.
        </Card>
      )}

      {data && (
        <div className="space-y-3">
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{data.result.recommendations.length} recommendations</Badge>
              {!data.aiUsed && <Badge variant="secondary">no AI run</Badge>}
              <span className="text-xs text-muted-foreground ml-auto">customer: {data.customerId}</span>
            </div>
            {data.result.customer_persona && (
              <p className="text-sm text-muted-foreground italic">
                Persona: {data.result.customer_persona}
              </p>
            )}
          </Card>

          {data.result.recommendations.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="text-xs uppercase text-muted-foreground">Top picks</div>
              <div className="space-y-2">
                {data.result.recommendations.map((r, i) => (
                  <div key={`${r.productId}-${i}`} className="rounded border p-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{r.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">id: {r.productId}</p>
                    </div>
                    <Badge variant="default">fit {r.fit_score.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Cross-sell themes</div>
              {data.result.cross_sell_themes.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {data.result.cross_sell_themes.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Upsell themes</div>
              {data.result.upsell_themes.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {data.result.upsell_themes.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
            </Card>
          </div>

          {data.result.notes.length > 0 && (
            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Notes</div>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {data.result.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
