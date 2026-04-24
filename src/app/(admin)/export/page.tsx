"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, Package, ShoppingCart, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ExportPage() {
  const { toast } = useToast()

  const handleExport = async (type: "csv" | "pdf", entity: string) => {
    try {
      toast({ title: "Exporting...", description: `Generating ${type.toUpperCase()} for ${entity}` })

      const res = await fetch(`/api/export/${type}/${entity}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${entity}-${new Date().toISOString().split("T")[0]}.${type === "csv" ? "csv" : "html"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({ title: "Export complete", description: `${entity} ${type.toUpperCase()} downloaded`, variant: "success" })
    } catch {
      toast({ title: "Export failed", description: "Please try again", variant: "destructive" })
    }
  }

  const exports = [
    { entity: "products", label: "Products", icon: Package, description: "Export all products with variants, pricing, and inventory" },
    { entity: "orders", label: "Orders", icon: ShoppingCart, description: "Export all orders with customer info, items, and totals" },
    { entity: "customers", label: "Customers", icon: Users, description: "Export all customers with contact info and order history" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="text-sm text-muted-foreground">Download your store data in CSV or PDF format</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {exports.map((exp) => (
          <Card key={exp.entity}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <exp.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{exp.label}</CardTitle>
                  <CardDescription>{exp.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport("csv", exp.entity)}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("pdf", exp.entity)}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
