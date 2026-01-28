"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, Package } from "lucide-react"

interface Variant {
  id: string
  title: string
  sku: string | null
  inventoryQuantity: number
  product: {
    id: string
    title: string
    images: string[]
  }
}

interface LowStockAlertProps {
  variants: Variant[]
}

export function LowStockAlert({ variants }: LowStockAlertProps) {
  const router = useRouter()

  if (variants.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Package className="h-8 w-8" />
        <p>All products are well stocked</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {variants.map((variant) => (
        <div
          key={variant.id}
          onClick={() => router.push(`/inventory`)}
          className="flex items-center gap-4 rounded-lg border border-yellow-200 bg-yellow-50/50 p-3 transition-colors hover:bg-yellow-100/50 cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{variant.product.title}</p>
            <p className="text-xs text-muted-foreground">
              {variant.title !== "Default" && `${variant.title} • `}
              {variant.sku && `SKU: ${variant.sku}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-yellow-700">
              {variant.inventoryQuantity} left
            </p>
            <p className="text-xs text-yellow-600">Low stock</p>
          </div>
        </div>
      ))}
    </div>
  )
}
