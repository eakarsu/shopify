"use client"

import { OrdersTable } from "./OrdersTable"
import { PageHeader } from "@/components/layout/PageHeader"
import { OrderFilters } from "./OrderFilters"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface OrdersPageClientProps {
  orders: any[]
  stats: { total: number; unfulfilled: number; paid: number; pending: number }
  searchParams: { status?: string; financial?: string; fulfillment?: string; search?: string }
}

export function OrdersPageClient({ orders, stats, searchParams }: OrdersPageClientProps) {
  const { toast } = useToast()

  const handleExport = async (type: "csv" | "pdf") => {
    try {
      toast({ title: "Exporting...", description: `Generating ${type.toUpperCase()} export` })
      const res = await fetch(`/api/export/${type}/orders`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `orders.${type === "csv" ? "csv" : "html"}`
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
        title="Orders"
        description={`${stats.total} orders in your store`}
        action={{ label: "Create order", href: "/orders/new" }}
      >
        <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
          <Download className="mr-1 h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
          <FileText className="mr-1 h-4 w-4" /> PDF
        </Button>
      </PageHeader>

      <OrderFilters stats={stats} searchParams={searchParams} />

      <OrdersTable orders={orders} />
    </div>
  )
}
