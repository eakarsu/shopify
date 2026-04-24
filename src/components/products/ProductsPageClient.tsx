"use client"

import { useState } from "react"
import { ProductsTable } from "./ProductsTable"
import { ProductForm } from "./ProductForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { ProductFilters } from "./ProductFilters"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProductsPageClientProps {
  products: any[]
  stats: { total: number; active: number; draft: number; archived: number }
  currentStatus?: string
}

export function ProductsPageClient({ products, stats, currentStatus }: ProductsPageClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { toast } = useToast()

  const handleExport = async (type: "csv" | "pdf") => {
    try {
      toast({ title: "Exporting...", description: `Generating ${type.toUpperCase()} export` })
      const res = await fetch(`/api/export/${type}/products`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `products.${type === "csv" ? "csv" : "html"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: "Export complete", variant: "success" })
    } catch {
      toast({ title: "Export failed", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${stats.total} products in your store`}
        action={{ label: "Add product", onClick: () => setFormOpen(true) }}
      >
        <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
          <Download className="mr-1 h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
          <FileText className="mr-1 h-4 w-4" /> PDF
        </Button>
      </PageHeader>

      <ProductFilters stats={stats} currentStatus={currentStatus} />

      <ProductsTable products={products} />

      <ProductForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
