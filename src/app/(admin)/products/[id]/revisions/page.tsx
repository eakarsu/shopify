"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Revision {
  id: string
  productId: string
  source: string
  tone?: string
  audience?: string
  shortDescription?: string
  mediumDescription?: string
  fullDescription?: string
  seoDescription?: string
  bulletPoints?: string[]
  modelUsed?: string
  appliedToProduct: boolean
  impressions: number
  conversions: number
  createdAt: string
}

/**
 * Product Description Revisions admin page (audit proposal #5).
 * - Paginated list of every AI-generated description revision.
 * - Apply-on-demand replaces silent overwrite from old workflow.
 * - Auto-promote highest-converting variant via "Promote winner".
 */
export default function ProductRevisionsPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [data, setData] = useState<{ data: Revision[]; pagination: any }>({
    data: [],
    pagination: { totalPages: 1, total: 0 }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/ai/products/${productId}/revisions?page=${page}&pageSize=${pageSize}`)
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || "Failed")
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [page, productId])

  async function action(revisionId: string, kind: "apply" | "promote") {
    setActing(revisionId + ":" + kind)
    try {
      const r = await fetch(`/api/ai/products/${productId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, action: kind })
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || "Failed")
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Description Revisions</h1>
        <p className="text-muted-foreground text-sm">
          Every AI-generated description is stored as a revision. Apply or promote the winning variant.
        </p>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-3">
        {data.data.length === 0 && !loading && (
          <Card className="p-8 text-center text-muted-foreground">
            No revisions yet. Generate a description from the product page to create the first one.
          </Card>
        )}

        {data.data.map((rev) => (
          <Card key={rev.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={rev.source === "ai" ? "default" : "secondary"}>{rev.source}</Badge>
                  {rev.appliedToProduct && <Badge variant="outline">Applied</Badge>}
                  {rev.tone && <Badge variant="outline">{rev.tone}</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(rev.createdAt).toLocaleString()}</span>
                </div>
                <p className="font-medium text-sm">{rev.shortDescription || "(no short description)"}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{rev.fullDescription || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Model: {rev.modelUsed || "?"} • Impressions: {rev.impressions} • Conversions: {rev.conversions}
                  {rev.impressions > 0 && (
                    <> • CVR: {((rev.conversions / rev.impressions) * 100).toFixed(2)}%</>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rev.appliedToProduct || acting !== null}
                  onClick={() => action(rev.id, "apply")}
                >
                  {acting === rev.id + ":apply" ? "Applying…" : "Apply"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-sm text-muted-foreground">{data.pagination.total} revisions</span>
        <div className="flex items-center gap-3">
          {data.data.some(r => r.impressions > 0) && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const winner = [...data.data].filter(r => r.impressions > 0)
                  .sort((a, b) => (b.conversions / Math.max(1, b.impressions)) - (a.conversions / Math.max(1, a.impressions)))[0]
                if (winner) action(winner.id, "promote")
              }}
            >
              Promote winner
            </Button>
          )}
          <Pagination page={page} totalPages={data.pagination.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
