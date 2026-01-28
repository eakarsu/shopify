import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { CheckoutForm } from "@/components/storefront/CheckoutForm"

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

async function getShippingRates() {
  return prisma.shippingRate.findMany({
    where: {
      isActive: true
    },
    include: { shippingZone: true },
    orderBy: { price: "asc" }
  })
}

async function getTaxRates() {
  return prisma.taxRate.findMany({
    where: { isActive: true }
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

export default async function CheckoutPage() {
  const [cart, shippingRates, taxRates, session] = await Promise.all([
    getCartReadOnly(),
    getShippingRates(),
    getTaxRates(),
    getServerSession(authOptions)
  ])

  if (!cart || cart.items.length === 0) {
    redirect("/cart")
  }

  const discount = await getDiscount(cart.discountCode)

  const serializedCart = {
    id: cart.id,
    discountCode: cart.discountCode,
    items: cart.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      variant: {
        id: item.variant.id,
        title: item.variant.title,
        sku: item.variant.sku,
        price: Number(item.variant.price),
        product: {
          id: item.variant.product.id,
          title: item.variant.product.title,
          images: item.variant.product.images
        }
      }
    }))
  }

  const serializedShippingRates = shippingRates.map(rate => ({
    id: rate.id,
    name: rate.name,
    price: Number(rate.price),
    minOrderAmount: rate.minOrderAmount ? Number(rate.minOrderAmount) : null,
    maxOrderAmount: rate.maxOrderAmount ? Number(rate.maxOrderAmount) : null,
    estimatedDays: rate.estimatedDays,
    zone: {
      id: rate.shippingZone.id,
      name: rate.shippingZone.name,
      countries: rate.shippingZone.countries,
      states: rate.shippingZone.states
    }
  }))

  const serializedTaxRates = taxRates.map(rate => ({
    id: rate.id,
    name: rate.name,
    rate: Number(rate.rate),
    country: rate.country,
    state: rate.state
  }))

  const serializedDiscount = discount ? {
    id: discount.id,
    code: discount.code,
    type: discount.type,
    value: Number(discount.value),
    minPurchaseAmount: discount.minPurchaseAmount ? Number(discount.minPurchaseAmount) : null
  } : null

  const customerInfo = session && (session.user as any)?.customerId ? {
    email: session.user?.email || "",
    name: session.user?.name || ""
  } : null

  return (
    <div className="min-h-screen bg-gray-50">
      <CheckoutForm
        cart={serializedCart}
        shippingRates={serializedShippingRates}
        taxRates={serializedTaxRates}
        discount={serializedDiscount}
        customerInfo={customerInfo}
      />
    </div>
  )
}
