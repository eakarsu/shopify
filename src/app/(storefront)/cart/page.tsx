import Link from "next/link"
import { cookies } from "next/headers"
import { formatCurrency } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { CartItems } from "@/components/storefront/CartItems"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, ArrowRight } from "lucide-react"

async function getCartReadOnly() {
  const cookieStore = cookies()
  const cartId = cookieStore.get("cartId")?.value

  if (!cartId) return null

  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: true,
          variant: {
            include: {
              product: true
            }
          }
        }
      }
    }
  })
}

async function getDiscount(code: string | null) {
  if (!code) return null

  return prisma.discount.findFirst({
    where: {
      code: { equals: code, mode: "insensitive" },
      status: "ACTIVE"
    }
  })
}

export default async function CartPage() {
  const cart = await getCartReadOnly()
  const discount = await getDiscount(cart?.discountCode || null)

  const items = cart?.items || []

  const subtotal = items.reduce((acc, item) => {
    return acc + Number(item.variant.price) * item.quantity
  }, 0)

  let discountAmount = 0
  if (discount) {
    if (discount.type === "PERCENTAGE") {
      discountAmount = subtotal * (Number(discount.value) / 100)
    } else {
      discountAmount = Number(discount.value)
    }
    if (discount.maxAmount && discountAmount > Number(discount.maxAmount)) {
      discountAmount = Number(discount.maxAmount)
    }
  }

  const total = subtotal - discountAmount

  const serializedItems = items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    variant: {
      id: item.variant.id,
      title: item.variant.title,
      sku: item.variant.sku,
      price: Number(item.variant.price),
      inventoryQuantity: item.variant.inventoryQuantity,
      product: {
        id: item.variant.product.id,
        title: item.variant.product.title,
        slug: item.variant.product.slug,
        images: item.variant.product.images
      }
    }
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {items.length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CartItems
              items={serializedItems}
              discountCode={cart?.discountCode || null}
            />
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {discount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount.code})</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <Link href="/checkout" className="block">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/shop" className="block">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Link href="/shop">
            <Button size="lg">
              Start Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
