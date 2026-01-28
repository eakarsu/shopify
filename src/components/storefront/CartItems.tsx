"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Minus, Plus, Trash2, Tag, X, Package } from "lucide-react"
import { updateCartItem, removeCartItem, applyDiscountCode, removeDiscountCode } from "@/lib/actions/cart"

interface CartItem {
  id: string
  quantity: number
  variant: {
    id: string
    title: string
    sku: string | null
    price: number
    inventoryQuantity: number
    product: {
      id: string
      title: string
      slug: string
      images: string[]
    }
  }
}

interface CartItemsProps {
  items: CartItem[]
  discountCode: string | null
}

export function CartItems({ items, discountCode }: CartItemsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    setLoading(itemId)
    try {
      await updateCartItem(itemId, quantity)
      router.refresh()
    } catch (error) {
      console.error("Failed to update item:", error)
    } finally {
      setLoading(null)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    setLoading(itemId)
    try {
      await removeCartItem(itemId)
      router.refresh()
    } catch (error) {
      console.error("Failed to remove item:", error)
    } finally {
      setLoading(null)
    }
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponCode.trim()) return

    setApplyingCoupon(true)
    setCouponError("")
    try {
      const result = await applyDiscountCode(couponCode.trim())
      if (!result.success) {
        setCouponError(result.error || "Invalid code")
      } else {
        setCouponCode("")
        router.refresh()
      }
    } catch (error) {
      setCouponError("Failed to apply code")
    } finally {
      setApplyingCoupon(false)
    }
  }

  const handleRemoveCoupon = async () => {
    try {
      await removeDiscountCode()
      router.refresh()
    } catch (error) {
      console.error("Failed to remove coupon:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cart Items */}
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Link
                  href={`/shop/product/${item.variant.product.slug}`}
                  className="h-24 w-24 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0"
                >
                  {item.variant.product.images[0] ? (
                    <img
                      src={item.variant.product.images[0]}
                      alt={item.variant.product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/shop/product/${item.variant.product.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {item.variant.product.title}
                  </Link>
                  {item.variant.title !== "Default" && (
                    <p className="text-sm text-muted-foreground">
                      {item.variant.title}
                    </p>
                  )}
                  {item.variant.sku && (
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.variant.sku}
                    </p>
                  )}
                  <p className="font-bold mt-1">
                    {formatCurrency(item.variant.price)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={loading === item.id || item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={loading === item.id || item.quantity >= item.variant.inventoryQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={loading === item.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>

                  <p className="font-bold">
                    {formatCurrency(item.variant.price * item.quantity)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Discount Code */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Discount Code</span>
          </div>

          {discountCode ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
              <div>
                <span className="font-medium text-green-800">{discountCode}</span>
                <span className="text-sm text-green-600 ml-2">applied</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCoupon}
                className="text-green-800 hover:text-green-900"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <Input
                placeholder="Enter discount code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={applyingCoupon}>
                {applyingCoupon ? "Applying..." : "Apply"}
              </Button>
            </form>
          )}

          {couponError && (
            <p className="text-red-600 text-sm mt-2">{couponError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
