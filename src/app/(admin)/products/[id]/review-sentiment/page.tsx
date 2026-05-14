"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SentimentSummary {
  overallSentiment: "positive" | "negative" | "mixed" | "neutral"
  sentimentScore: number
  averageRating: number
  totalReviews: number
  topPositiveThemes: string[]
  topNegativeThemes: string[]
  representativePositive?: string
  representativeNegative?: string
  flaggedIssues: string[]
  suggestedActions: string[]
}

interface SentimentResponse {
  productId: string
  productTitle: string
  summary: SentimentSummary
  aiUsed: boolean
}

/**
 * Product Review Sentiment admin page.
 * - On-demand POST to /api/ai/products/[id]/review-sentiment.
 * - Renders overall sentiment, themes, flagged issues, and suggested actions.
 */
export default function ReviewSentimentPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id
  const [data, setData] = useState<SentimentResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/ai/products/${productId}/review-sentiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || "Failed")
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function sentimentVariant(s: SentimentSummary["overallSentiment"]): "default" | "secondary" | "destructive" | "outline" {
    if (s === "positive") return "default"
    if (s === "negative") return "destructive"
    if (s === "mixed") return "secondary"
    return "outline"
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Review Sentiment</h1>
        <p className="text-muted-foreground text-sm">
          Aggregate AI sentiment analysis over this product&apos;s most recent approved reviews.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={loading}>
          {loading ? "Analysing…" : data ? "Re-run analysis" : "Run analysis"}
        </Button>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!data && !loading && !error && (
        <Card className="p-8 text-center text-muted-foreground">
          Click &quot;Run analysis&quot; to summarise customer sentiment for this product.
        </Card>
      )}

      {data && (
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={sentimentVariant(data.summary.overallSentiment)}>
                {data.summary.overallSentiment}
              </Badge>
              <Badge variant="outline">score: {data.summary.sentimentScore.toFixed(2)}</Badge>
              <Badge variant="outline">avg rating: {data.summary.averageRating.toFixed(2)}/5</Badge>
              <Badge variant="outline">{data.summary.totalReviews} reviews</Badge>
              {!data.aiUsed && <Badge variant="secondary">no reviews</Badge>}
              <span className="text-xs text-muted-foreground ml-auto">{data.productTitle}</span>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Top positive themes</div>
              {data.summary.topPositiveThemes.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {data.summary.topPositiveThemes.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {data.summary.representativePositive && (
                <p className="text-xs italic text-muted-foreground border-l-2 pl-2 mt-2">
                  &ldquo;{data.summary.representativePositive}&rdquo;
                </p>
              )}
            </Card>

            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Top negative themes</div>
              {data.summary.topNegativeThemes.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {data.summary.topNegativeThemes.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {data.summary.representativeNegative && (
                <p className="text-xs italic text-muted-foreground border-l-2 pl-2 mt-2">
                  &ldquo;{data.summary.representativeNegative}&rdquo;
                </p>
              )}
            </Card>
          </div>

          {data.summary.flaggedIssues.length > 0 && (
            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Flagged issues</div>
              <div className="flex flex-wrap gap-2">
                {data.summary.flaggedIssues.map((issue, i) => (
                  <Badge key={i} variant="destructive">{issue}</Badge>
                ))}
              </div>
            </Card>
          )}

          {data.summary.suggestedActions.length > 0 && (
            <Card className="p-4 space-y-2">
              <div className="text-xs uppercase text-muted-foreground">Suggested actions</div>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {data.summary.suggestedActions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
