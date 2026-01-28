"use client"

import { useRouter } from "next/navigation"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { Package } from "lucide-react"

interface Product {
  id: string | null
  title: string
  image?: string
  sales: number
  quantity: number
}

interface TopProductsProps {
  products: Product[]
}

export function TopProducts({ products }: TopProductsProps) {
  const router = useRouter()

  if (products.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No product data
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <div
          key={product.id || index}
          onClick={() => product.id && router.push(`/products/${product.id}`)}
          className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{product.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(product.quantity)} sold
            </p>
          </div>
          <div className="text-sm font-medium">{formatCurrency(product.sales)}</div>
        </div>
      ))}
    </div>
  )
}
