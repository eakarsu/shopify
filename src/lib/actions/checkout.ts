"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { actorFromSession } from "@/lib/order/access"
import { OrderDomainError, type OrderActor } from "@/lib/order/domain"
import { providersFromEnvironment } from "@/lib/order/providers"
import { OrderOperationsService } from "@/lib/order/service"

interface CreateOrderData {
  idempotencyKey: string
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
    const actor: OrderActor = actorFromSession(session) ?? { type: "CUSTOMER", id: null, customerId: null }
    if (actor.type !== "CUSTOMER") {
      return { success: false as const, error: "Customer checkout requires a storefront session", code: "ORDER_FORBIDDEN" }
    }
    const shippingRate = await prisma.shippingRate.findUnique({ where: { id: data.shippingRateId } })
    if (!shippingRate?.isActive) {
      return { success: false as const, error: "The selected shipping service is unavailable", code: "INVALID_SHIPPING_SERVICE" }
    }

    const service = new OrderOperationsService(prisma, providersFromEnvironment())
    const quote = await service.quoteCheckout({
      idempotencyKey: `${data.idempotencyKey}:quote`,
      cartId: data.cartId,
      shippingService: shippingRate.name,
      shippingAddress: {
        address1: data.shippingAddress1,
        address2: data.shippingAddress2 || undefined,
        city: data.shippingCity,
        state: data.shippingState || undefined,
        postalCode: data.shippingPostalCode,
        country: data.shippingCountry,
      },
    }, actor)
    const payment = await service.placeOrder({
      idempotencyKey: `${data.idempotencyKey}:place`,
      quoteId: quote.id,
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      billingAddress: {
        address1: data.billingAddress1,
        city: data.billingCity,
        state: data.billingState || undefined,
        postalCode: data.billingPostalCode,
        country: data.billingCountry,
      },
      notes: data.notes,
    }, actor)
    return {
      success: true as const,
      orderId: payment.orderId,
      paymentIntentId: payment.paymentIntentId,
      clientSecret: payment.clientSecret,
      amount: quote.totalPrice.toString(),
      currency: quote.currency,
    }
  } catch (error) {
    console.error("Create order failed", error)
    if (error instanceof OrderDomainError) {
      return { success: false as const, error: error.message, code: error.code }
    }
    return { success: false as const, error: "Checkout could not be completed", code: "CHECKOUT_FAILED" }
  }
}
