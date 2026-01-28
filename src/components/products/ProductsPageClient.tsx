"use client"

import { useState } from "react"
import { ProductsTable } from "./ProductsTable"
import { ProductForm } from "./ProductForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { ProductFilters } from "./ProductFilters"

interface ProductsPageClientProps {
  products: any[]
  stats: { total: number; active: number; draft: number; archived: number }
  currentStatus?: string
}

export function ProductsPageClient({ products, stats, currentStatus }: ProductsPageClientProps) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${stats.total} products in your store`}
        action={{ label: "Add product", onClick: () => setFormOpen(true) }}
      />

      <ProductFilters stats={stats} currentStatus={currentStatus} />

      <ProductsTable products={products} />

      <ProductForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
