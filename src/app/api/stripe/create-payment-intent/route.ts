import { NextRequest, NextResponse } from "next/server"
import { createPaymentIntent } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId, shippingAmount, taxAmount, discountAmount, giftCardAmount } = body

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: true,
            product: true
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant ? Number(item.variant.price) : Number(item.product.price)
      return sum + price * item.quantity
    }, 0)

    // Calculate total
    const total = subtotal + (shippingAmount || 0) + (taxAmount || 0) - (discountAmount || 0) - (giftCardAmount || 0)

    if (total <= 0) {
      return NextResponse.json({ error: "Invalid total amount" }, { status: 400 })
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent(total, "usd", {
      cartId,
      subtotal: subtotal.toString(),
      shipping: (shippingAmount || 0).toString(),
      tax: (taxAmount || 0).toString(),
      discount: (discountAmount || 0).toString(),
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: total
    })
  } catch (error: any) {
    console.error("Payment intent error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
