"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Pagination — controlled pagination matching the platform pattern:
 *   props: { page, totalPages, onPageChange }
 *
 * Used by paginated lists (AI results history, product description revisions, etc.)
 */
export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

function buildWindow(page: number, totalPages: number, window = 1): (number | "…")[] {
  const set = new Set<number>([1, totalPages, page, page - window, page + window])
  for (let i = page - window; i <= page + window; i++) if (i > 0 && i <= totalPages) set.add(i)
  const sorted = Array.from(set).filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  const out: (number | "…")[] = []
  let prev = 0
  for (const n of sorted) {
    if (n - prev > 1) out.push("…")
    out.push(n)
    prev = n
  }
  return out
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (!totalPages || totalPages <= 1) return null
  const safePage = Math.min(Math.max(1, page), totalPages)
  const items = buildWindow(safePage, totalPages, 1)

  const goto = (p: number) => {
    if (p < 1 || p > totalPages || p === safePage) return
    onPageChange(p)
  }

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Pagination">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => goto(safePage - 1)}
        disabled={safePage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Prev</span>
      </Button>

      {items.map((it, idx) =>
        it === "…" ? (
          <span key={`gap-${idx}`} className="px-2 text-muted-foreground">…</span>
        ) : (
          <Button
            key={it}
            type="button"
            variant={it === safePage ? "default" : "outline"}
            size="sm"
            onClick={() => goto(it)}
            aria-current={it === safePage ? "page" : undefined}
          >
            {it}
          </Button>
        )
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => goto(safePage + 1)}
        disabled={safePage === totalPages}
        aria-label="Next page"
      >
        <span className="mr-1 hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

export default Pagination
