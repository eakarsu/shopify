"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface CreateOrderData {
  cartId: string
  email: string
  phone: string
  firstName: string
  lastName: string
  shippingAddress1: string
  shippingAddress2: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
  billingAddress1: string
  billingCity: string
  billingState: string
  billingPostalCode: string
  billingCountry: string
  shippingRateId: string
  discountCode: string | null
  giftCardCode?: string
  notes?: string
}

export async function createOrder(data: CreateOrderData) {
  try {
    const session = await getServerSession(authOptions)

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { id: data.cartId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return { success: false, error: "Cart is empty" }
    }

    // Get shipping rate
    const shippingRate = await prisma.shippingRate.findUnique({
      where: { id: data.shippingRateId }
    })

    if (!shippingRate) {
      return { success: false, error: "Invalid shipping rate" }
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((acc, item) => {
      return acc + Number(item.variant.price) * item.quantity
    }, 0)

    // Get discount
    let discountAmount = 0
    let discount = null
    if (data.discountCode) {
      discount = await prisma.discount.findFirst({
        where: {
          code: { equals: data.discountCode, mode: "insensitive" },
          isActive: true
        }
      })

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
    }

    // Get gift card
    let giftCardAmount = 0
    let giftCard = null
    if (data.giftCardCode) {
      giftCard = await prisma.giftCard.findFirst({
        where: {
          code: { equals: data.giftCardCode, mode: "insensitive" },
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ]
        }
      })

      if (giftCard && Number(giftCard.balance) > 0) {
        const remainingTotal = subtotal - discountAmount + Number(shippingRate.price)
        giftCardAmount = Math.min(Number(giftCard.balance), remainingTotal)
      }
    }

    // Calculate tax
    const taxRate = await prisma.taxRate.findFirst({
      where: {
        country: data.shippingCountry,
        OR: [
          { state: data.shippingState },
          { state: null }
        ],
        isActive: true
      },
      orderBy: { state: "desc" } // Prefer state-specific rate
    })

    const taxableAmount = subtotal - discountAmount + Number(shippingRate.price)
    const taxAmount = taxRate ? taxableAmount * (Number(taxRate.rate) / 100) : 0

    // Calculate total
    const totalPrice = subtotal - discountAmount + Number(shippingRate.price) + taxAmount - giftCardAmount

    // Find or create customer
    let customer = null
    if (session && (session.user as any)?.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: (session.user as any).customerId }
      })
    }

    if (!customer) {
      customer = await prisma.customer.findFirst({
        where: { email: data.email }
      })

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          }
        })
      }
    }

    // Get next order number
    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: "desc" }
    })
    const orderNumber = (lastOrder?.orderNumber || 1000) + 1

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        email: data.email,
        phone: data.phone,
        status: "PENDING",
        financialStatus: "PAID", // Demo mode - mark as paid
        fulfillmentStatus: "UNFULFILLED",
        currency: "USD",
        subtotalPrice: subtotal,
        totalTax: taxAmount,
        totalShipping: Number(shippingRate.price),
        totalDiscounts: discountAmount,
        totalPrice,
        shippingAddress1: data.shippingAddress1,
        shippingAddress2: data.shippingAddress2,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingPostalCode: data.shippingPostalCode,
        shippingCountry: data.shippingCountry,
        billingAddress1: data.billingAddress1,
        billingCity: data.billingCity,
        billingState: data.billingState,
        billingPostalCode: data.billingPostalCode,
        billingCountry: data.billingCountry,
        discountCode: data.discountCode,
        notes: data.notes,
        items: {
          create: cart.items.map(item => ({
            productId: item.variant.product.id,
            variantId: item.variant.id,
            title: item.variant.product.title,
            variantTitle: item.variant.title !== "Default" ? item.variant.title : null,
            sku: item.variant.sku,
            quantity: item.quantity,
            price: item.variant.price,
            totalPrice: Number(item.variant.price) * item.quantity
          }))
        },
        timeline: {
          create: [
            {
              type: "created",
              message: "Order placed"
            },
            {
              type: "paid",
              message: "Payment received"
            }
          ]
        }
      }
    })

    // Update inventory
    for (const item of cart.items) {
      await prisma.variant.update({
        where: { id: item.variant.id },
        data: {
          inventoryQuantity: {
            decrement: item.quantity
          }
        }
      })
    }

    // Update customer stats
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: totalPrice }
      }
    })

    // Update discount usage
    if (discount) {
      await prisma.discount.update({
        where: { id: discount.id },
        data: { usageCount: { increment: 1 } }
      })
    }

    // Update gift card
    if (giftCard && giftCardAmount > 0) {
      await prisma.giftCard.update({
        where: { id: giftCard.id },
        data: {
          balance: { decrement: giftCardAmount }
        }
      })

      await prisma.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          orderId: order.id,
          type: "REDEMPTION",
          amount: giftCardAmount
        }
      })
    }

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    })

    // Clear cart cookie if guest
    if (!session) {
      const cookieStore = cookies()
      cookieStore.delete("cartId")
    }

    revalidatePath("/")
    return { success: true, orderId: order.id }
  } catch (error) {
    console.error("Create order error:", error)
    return { success: false, error: "Failed to create order" }
  }
}
