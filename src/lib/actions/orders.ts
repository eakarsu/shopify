"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function createOrder(data: {
  customerId?: string
  email: string
  phone?: string
  items: {
    productId?: string
    variantId?: string
    title: string
    variantTitle?: string
    sku?: string
    quantity: number
    price: number
  }[]
  shippingAddress?: {
    address1?: string
    address2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  discountCode?: string
  notes?: string
}) {
  const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalTax = subtotal * 0.08
  const totalShipping = subtotal > 100 ? 0 : 9.99
  const totalPrice = subtotal + totalTax + totalShipping

  const order = await db.order.create({
    data: {
      customerId: data.customerId,
      email: data.email,
      phone: data.phone,
      status: "OPEN",
      financialStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      subtotalPrice: subtotal,
      totalTax,
      totalShipping,
      totalPrice,
      shippingAddress1: data.shippingAddress?.address1,
      shippingAddress2: data.shippingAddress?.address2,
      shippingCity: data.shippingAddress?.city,
      shippingState: data.shippingAddress?.state,
      shippingPostalCode: data.shippingAddress?.postalCode,
      shippingCountry: data.shippingAddress?.country,
      billingAddress1: data.shippingAddress?.address1,
      billingCity: data.shippingAddress?.city,
      billingState: data.shippingAddress?.state,
      billingPostalCode: data.shippingAddress?.postalCode,
      billingCountry: data.shippingAddress?.country,
      discountCode: data.discountCode,
      notes: data.notes,
      items: {
        create: data.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          title: item.title,
          variantTitle: item.variantTitle,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * item.quantity
        }))
      },
      timeline: {
        create: {
          type: "created",
          message: "Order created"
        }
      }
    }
  })

  // Update customer totals if customerId exists
  if (data.customerId) {
    await db.customer.update({
      where: { id: data.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: totalPrice }
      }
    })
  }

  revalidatePath("/orders")
  revalidatePath("/dashboard")
  revalidatePath("/customers")
  return order
}

export async function markOrderAsPaid(id: string) {
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { financialStatus: "PAID" }
    }),
    db.orderTimeline.create({
      data: {
        orderId: id,
        type: "paid",
        message: "Payment received"
      }
    })
  ])

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  revalidatePath("/dashboard")
}

export async function markOrderAsFulfilled(id: string) {
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { fulfillmentStatus: "FULFILLED" }
    }),
    db.orderTimeline.create({
      data: {
        orderId: id,
        type: "fulfilled",
        message: "Order fulfilled and shipped"
      }
    })
  ])

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  revalidatePath("/dashboard")
}

export async function markOrderAsPartiallyFulfilled(id: string) {
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { fulfillmentStatus: "PARTIALLY_FULFILLED" }
    }),
    db.orderTimeline.create({
      data: {
        orderId: id,
        type: "partially_fulfilled",
        message: "Order partially fulfilled"
      }
    })
  ])

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
}

export async function cancelOrder(id: string) {
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { status: "CANCELLED" }
    }),
    db.orderTimeline.create({
      data: {
        orderId: id,
        type: "cancelled",
        message: "Order cancelled"
      }
    })
  ])

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  revalidatePath("/dashboard")
}

export async function refundOrder(id: string) {
  const order = await db.order.findUnique({
    where: { id },
    select: { customerId: true, totalPrice: true }
  })

  await db.$transaction([
    db.order.update({
      where: { id },
      data: { financialStatus: "REFUNDED" }
    }),
    db.orderTimeline.create({
      data: {
        orderId: id,
        type: "refunded",
        message: "Order refunded"
      }
    })
  ])

  // Update customer totals
  if (order?.customerId) {
    await db.customer.update({
      where: { id: order.customerId },
      data: {
        totalSpent: { decrement: Number(order.totalPrice) }
      }
    })
  }

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  revalidatePath("/dashboard")
  revalidatePath("/customers")
}

export async function archiveOrder(id: string) {
  await db.order.update({
    where: { id },
    data: { status: "ARCHIVED" }
  })

  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
}

export async function addOrderNote(id: string, note: string) {
  await db.order.update({
    where: { id },
    data: { notes: note }
  })

  revalidatePath(`/orders/${id}`)
}
