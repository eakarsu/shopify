"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createFulfillment(data: {
  orderId: string
  items: { orderItemId: string; quantity: number }[]
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  notifyCustomer?: boolean
}) {
  const { orderId, items, trackingNumber, trackingUrl, carrier, notifyCustomer } = data

  // Verify order exists
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: true
    }
  })

  if (!order) {
    return { success: false, error: "Order not found" }
  }

  // Create fulfillment
  const fulfillment = await prisma.fulfillment.create({
    data: {
      orderId,
      trackingNumber,
      trackingUrl,
      carrier,
      status: trackingNumber ? "SHIPPED" : "PENDING",
      shippedAt: trackingNumber ? new Date() : null,
      items: {
        create: items.map(item => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity
        }))
      }
    },
    include: { items: true }
  })

  // Update order fulfillment status
  const allOrderItems = order.items
  const fulfilledItems = await prisma.fulfillmentItem.groupBy({
    by: ["orderItemId"],
    where: {
      fulfillment: { orderId }
    },
    _sum: { quantity: true }
  })

  const fulfilledMap = new Map(fulfilledItems.map(f => [f.orderItemId, f._sum.quantity || 0]))

  const isFullyFulfilled = allOrderItems.every(item =>
    (fulfilledMap.get(item.id) || 0) >= item.quantity
  )

  const isPartiallyFulfilled = fulfilledItems.length > 0

  await prisma.order.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: isFullyFulfilled ? "FULFILLED" : isPartiallyFulfilled ? "PARTIAL" : "UNFULFILLED"
    }
  })

  // Send notification to customer
  if (notifyCustomer && order.customer?.email && trackingNumber) {
    await sendShipmentNotification(order, fulfillment)
  }

  revalidatePath(`/admin/orders/${orderId}`)
  return { success: true, fulfillment }
}

export async function updateFulfillment(
  fulfillmentId: string,
  data: {
    trackingNumber?: string
    trackingUrl?: string
    carrier?: string
    status?: "PENDING" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"
    notifyCustomer?: boolean
  }
) {
  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: fulfillmentId },
    include: {
      order: { include: { customer: true } }
    }
  })

  if (!fulfillment) {
    return { success: false, error: "Fulfillment not found" }
  }

  const updateData: any = {}

  if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber
  if (data.trackingUrl) updateData.trackingUrl = data.trackingUrl
  if (data.carrier) updateData.carrier = data.carrier
  if (data.status) {
    updateData.status = data.status
    if (data.status === "SHIPPED" && !fulfillment.shippedAt) {
      updateData.shippedAt = new Date()
    }
    if (data.status === "DELIVERED") {
      updateData.deliveredAt = new Date()
    }
  }

  const updated = await prisma.fulfillment.update({
    where: { id: fulfillmentId },
    data: updateData
  })

  // Send notification
  if (data.notifyCustomer && fulfillment.order.customer?.email) {
    if (data.status === "SHIPPED" || data.trackingNumber) {
      await sendShipmentNotification(fulfillment.order, updated)
    } else if (data.status === "DELIVERED") {
      await sendDeliveryNotification(fulfillment.order, updated)
    }
  }

  revalidatePath(`/admin/orders/${fulfillment.orderId}`)
  return { success: true, fulfillment: updated }
}

export async function cancelFulfillment(fulfillmentId: string) {
  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: fulfillmentId },
    include: { items: true }
  })

  if (!fulfillment) {
    return { success: false, error: "Fulfillment not found" }
  }

  // Delete fulfillment items first
  await prisma.fulfillmentItem.deleteMany({
    where: { fulfillmentId }
  })

  // Delete fulfillment
  await prisma.fulfillment.delete({
    where: { id: fulfillmentId }
  })

  // Recalculate order fulfillment status
  const remainingFulfillments = await prisma.fulfillment.count({
    where: { orderId: fulfillment.orderId }
  })

  await prisma.order.update({
    where: { id: fulfillment.orderId },
    data: {
      fulfillmentStatus: remainingFulfillments > 0 ? "PARTIAL" : "UNFULFILLED"
    }
  })

  revalidatePath(`/admin/orders/${fulfillment.orderId}`)
  return { success: true }
}

export async function getCarriers() {
  return [
    { id: "usps", name: "USPS", trackingUrlTemplate: "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}" },
    { id: "ups", name: "UPS", trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking}" },
    { id: "fedex", name: "FedEx", trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={tracking}" },
    { id: "dhl", name: "DHL", trackingUrlTemplate: "https://www.dhl.com/en/express/tracking.html?AWB={tracking}" },
    { id: "other", name: "Other", trackingUrlTemplate: "" }
  ]
}

export async function getTrackingUrl(carrier: string, trackingNumber: string): Promise<string> {
  const carriers = await getCarriers()
  const carrierInfo = carriers.find(c => c.id === carrier)

  if (!carrierInfo || !carrierInfo.trackingUrlTemplate) {
    return ""
  }

  return carrierInfo.trackingUrlTemplate.replace("{tracking}", trackingNumber)
}

async function sendShipmentNotification(order: any, fulfillment: any) {
  // Send email notification (using email service)
  console.log(`Sending shipment notification to ${order.customer?.email}`)
  console.log(`Tracking: ${fulfillment.trackingNumber}`)

  // In production, integrate with email service
  // await sendEmail({
  //   to: order.customer.email,
  //   subject: `Your order has shipped! - Order #${order.orderNumber}`,
  //   template: "shipment-notification",
  //   data: { order, fulfillment }
  // })
}

async function sendDeliveryNotification(order: any, fulfillment: any) {
  console.log(`Sending delivery notification to ${order.customer?.email}`)

  // In production, integrate with email service
}
