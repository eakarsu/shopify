import {
  Prisma,
  PrismaClient,
  type Order,
  type OrderItem,
  type OrderWorkflowState as PrismaOrderWorkflowState,
} from "@prisma/client"
import {
  OrderDomainError,
  assertCommandPermission,
  cents,
  decimalAmount,
  sha256,
  stableJson,
  transitionOrder,
  type OrderActor,
  type OrderWorkflowState,
} from "./domain"
import type {
  Address,
  OrderProviders,
  PaymentIntentState,
  QuoteLine,
  RefundResult,
  ShipmentResult,
} from "./providers"

type Transaction = Prisma.TransactionClient
type JsonRecord = Record<string, unknown>

interface QuoteLineSnapshot extends QuoteLine {
  cartItemId: string
  unitPrice: string
}

interface InventoryRow {
  id: string
  variantId: string
  quantity: number
  reserved: number
}

interface CommandClaim {
  id: string
  status: "STARTED" | "SUCCEEDED" | "FAILED"
  orderId: string | null
  result: Prisma.JsonValue | null
  replayed: boolean
}

export interface QuoteCheckoutInput {
  idempotencyKey: string
  cartId: string
  currency?: string
  shippingAddress: Address
  shippingService?: string
}

export interface PlaceOrderInput {
  idempotencyKey: string
  quoteId: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  billingAddress?: Address
  notes?: string
}

export interface FulfillmentInput {
  idempotencyKey: string
  orderId: string
  items: Array<{ orderItemId: string; quantity: number }>
}

export interface ProviderPaymentEvent {
  provider: string
  eventId: string
  eventType: string
  paymentIntentId: string
  outcome: "succeeded" | "failed" | "cancelled"
  payload: JsonRecord
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(stableJson(value)) as Prisma.InputJsonValue
}

function stateSnapshot(order: Pick<
  Order,
  "workflowState" | "status" | "financialStatus" | "fulfillmentStatus" | "version" | "paymentStatus"
>): JsonRecord {
  return {
    workflowState: order.workflowState,
    orderStatus: order.status,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentStatus: order.paymentStatus,
    version: order.version,
  }
}

function isPrismaCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export class OrderOperationsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly providers: OrderProviders,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async quoteCheckout(input: QuoteCheckoutInput, actor: OrderActor) {
    if (!input.idempotencyKey) throw new OrderDomainError("Idempotency-Key is required", "IDEMPOTENCY_REQUIRED", 400)
    const requestHash = sha256(input)
    const existing = await this.db.checkoutQuote.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new OrderDomainError("Idempotency key was reused with a different quote request", "IDEMPOTENCY_CONFLICT")
      }
      return existing
    }

    const cart = await this.db.cart.findUnique({
      where: { id: input.cartId },
      include: {
        customerAccount: true,
        items: { include: { product: true, variant: true } },
      },
    })
    if (!cart || !cart.items.length) throw new OrderDomainError("Cart is empty", "EMPTY_CART", 400)
    if (cart.discountCode || cart.giftCardCode) {
      throw new OrderDomainError(
        "Discount and gift-card settlement is outside the inventory-backed checkout workflow; remove them before checkout",
        "UNSUPPORTED_CHECKOUT_ADJUSTMENT",
        409,
      )
    }
    if (cart.customerAccount && actor.customerId !== cart.customerAccount.customerId) {
      throw new OrderDomainError("Cart is not accessible to this customer", "ORDER_FORBIDDEN", 403)
    }
    if (actor.type !== "CUSTOMER" && actor.type !== "SYSTEM") {
      throw new OrderDomainError("Only customers may quote checkout", "ORDER_FORBIDDEN", 403)
    }

    const originLocation = await this.db.location.findFirst({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    })
    if (
      !originLocation?.address1 ||
      !originLocation.city ||
      !originLocation.postalCode ||
      !originLocation.country
    ) {
      throw new OrderDomainError(
        "An active inventory origin with a complete address is required",
        "INVENTORY_ORIGIN_NOT_CONFIGURED",
        503,
      )
    }

    const lines: QuoteLineSnapshot[] = cart.items.map((item) => {
      if (!item.variant) {
        throw new OrderDomainError(
          `Cart item ${item.id} has no inventory-tracked variant`,
          "UNTRACKED_CART_ITEM",
          400,
        )
      }
      if (item.quantity <= 0) throw new OrderDomainError("Cart quantities must be positive", "INVALID_QUANTITY", 400)
      return {
        cartItemId: item.id,
        productId: item.productId,
        variantId: item.variant.id,
        sku: item.variant.sku,
        title: item.product.title,
        quantity: item.quantity,
        unitPriceCents: cents(item.variant.price),
        unitPrice: decimalAmount(cents(item.variant.price)),
        weightGrams: item.variant.weight ? Math.round(Number(item.variant.weight) * 1_000) : undefined,
      }
    })
    const currency = (input.currency ?? cart.currency).toUpperCase()
    const origin: Address = {
      address1: originLocation.address1,
      address2: originLocation.address2 ?? undefined,
      city: originLocation.city,
      state: originLocation.state ?? undefined,
      postalCode: originLocation.postalCode,
      country: originLocation.country,
    }
    const shipping = await this.providers.shipping.quote({
      idempotencyKey: `${input.idempotencyKey}:shipping`,
      currency,
      origin,
      destination: input.shippingAddress,
      lines,
      service: input.shippingService,
    })
    const tax = await this.providers.tax.quote({
      idempotencyKey: `${input.idempotencyKey}:tax`,
      currency,
      address: input.shippingAddress,
      shippingCents: shipping.amountCents,
      lines,
    })
    if (shipping.currency !== currency || tax.currency !== currency) {
      throw new OrderDomainError("Provider quote currency does not match the cart", "PROVIDER_CURRENCY_MISMATCH", 502)
    }

    const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
    const expiresAt = new Date(Math.min(shipping.expiresAt.getTime(), tax.expiresAt.getTime()))
    if (expiresAt <= this.now()) throw new OrderDomainError("Provider returned an expired quote", "QUOTE_EXPIRED", 502)

    try {
      return await this.db.checkoutQuote.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          requestHash,
          cartId: cart.id,
          customerId: cart.customerAccount?.customerId,
          currency,
          lineItems: asJson(lines),
          shippingAddress: asJson(input.shippingAddress),
          subtotalPrice: decimalAmount(subtotalCents),
          totalTax: decimalAmount(tax.amountCents),
          totalShipping: decimalAmount(shipping.amountCents),
          totalPrice: decimalAmount(subtotalCents + tax.amountCents + shipping.amountCents),
          taxProvider: tax.provider,
          taxQuoteId: tax.quoteId,
          shippingProvider: shipping.provider,
          shippingQuoteId: shipping.quoteId,
          shippingService: shipping.service,
          expiresAt,
        },
      })
    } catch (error) {
      if (!isPrismaCode(error, "P2002")) throw error
      const replay = await this.db.checkoutQuote.findUniqueOrThrow({ where: { idempotencyKey: input.idempotencyKey } })
      if (replay.requestHash !== requestHash) {
        throw new OrderDomainError("Idempotency key was reused with a different quote request", "IDEMPOTENCY_CONFLICT")
      }
      return replay
    }
  }

  async placeOrder(input: PlaceOrderInput, actor: OrderActor): Promise<{ orderId: string; clientSecret: string | null; paymentIntentId: string }> {
    const claim = await this.claimCommand("PLACE_ORDER", input.idempotencyKey, input, actor)
    if (claim.status === "SUCCEEDED") return claim.result as unknown as { orderId: string; clientSecret: string | null; paymentIntentId: string }
    if (claim.replayed && !claim.orderId) {
      throw new OrderDomainError("The checkout command is already in progress", "COMMAND_IN_PROGRESS", 409)
    }

    let orderId = claim.orderId
    if (!orderId) {
      try {
        orderId = await this.db.$transaction(async (tx) => {
          await this.lockQuote(tx, input.quoteId)
          const quote = await tx.checkoutQuote.findUniqueOrThrow({ where: { id: input.quoteId } })
          if (quote.consumedAt || quote.orderId) {
            throw new OrderDomainError("Checkout quote has already been consumed", "QUOTE_CONSUMED")
          }
          if (quote.expiresAt <= this.now()) throw new OrderDomainError("Checkout quote has expired", "QUOTE_EXPIRED")
          if (quote.customerId && actor.customerId !== quote.customerId) {
            throw new OrderDomainError("Checkout quote belongs to another customer", "ORDER_FORBIDDEN", 403)
          }
          if (actor.type !== "CUSTOMER" && actor.type !== "SYSTEM") {
            throw new OrderDomainError("Only customers may place checkout orders", "ORDER_FORBIDDEN", 403)
          }

          const customer = quote.customerId
            ? await tx.customer.findUniqueOrThrow({ where: { id: quote.customerId } })
            : await tx.customer.upsert({
                where: { email: input.email.toLowerCase() },
                update: { firstName: input.firstName, lastName: input.lastName, phone: input.phone },
                create: {
                  email: input.email.toLowerCase(),
                  firstName: input.firstName,
                  lastName: input.lastName,
                  phone: input.phone,
                },
              })
          if (quote.customerId && customer.email.toLowerCase() !== input.email.toLowerCase()) {
            throw new OrderDomainError("Checkout email does not match the customer account", "ORDER_FORBIDDEN", 403)
          }

          const address = quote.shippingAddress as unknown as Address
          const billing = input.billingAddress ?? address
          const lines = quote.lineItems as unknown as QuoteLineSnapshot[]
          const order = await tx.order.create({
            data: {
              customerId: customer.id,
              email: input.email.toLowerCase(),
              phone: input.phone,
              status: "OPEN",
              financialStatus: "PENDING",
              fulfillmentStatus: "UNFULFILLED",
              workflowState: "AWAITING_PAYMENT",
              currency: quote.currency,
              subtotalPrice: quote.subtotalPrice,
              totalTax: quote.totalTax,
              totalShipping: quote.totalShipping,
              totalPrice: quote.totalPrice,
              shippingAddress1: address.address1,
              shippingAddress2: address.address2,
              shippingCity: address.city,
              shippingState: address.state,
              shippingPostalCode: address.postalCode,
              shippingCountry: address.country,
              shippingMethod: quote.shippingService,
              shippingRate: quote.totalShipping,
              billingAddress1: billing.address1,
              billingAddress2: billing.address2,
              billingCity: billing.city,
              billingState: billing.state,
              billingPostalCode: billing.postalCode,
              billingCountry: billing.country,
              reservationExpiresAt: quote.expiresAt,
              taxProvider: quote.taxProvider,
              taxQuoteId: quote.taxQuoteId,
              shippingProvider: quote.shippingProvider,
              shippingQuoteId: quote.shippingQuoteId,
              notes: input.notes,
              items: {
                create: lines.map((line) => ({
                  productId: line.productId,
                  variantId: line.variantId,
                  title: line.title,
                  sku: line.sku,
                  quantity: line.quantity,
                  price: line.unitPrice,
                  totalPrice: decimalAmount(line.unitPriceCents * line.quantity),
                })),
              },
            },
            include: { items: true },
          })

          await this.reserveInventory(tx, order, lines, quote.expiresAt)
          await tx.checkoutQuote.update({
            where: { id: quote.id },
            data: { consumedAt: this.now(), orderId: order.id },
          })
          await tx.orderCommand.update({ where: { id: claim.id }, data: { orderId: order.id } })
          await this.appendAudit(tx, order, "ORDER_RESERVED", actor, input.idempotencyKey, {}, {
            ...stateSnapshot(order),
            reservationExpiresAt: quote.expiresAt.toISOString(),
          })
          await this.enqueue(tx, order.id, "order.created", { orderId: order.id, orderNumber: order.orderNumber })
          return order.id
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (error) {
        await this.failCommand(claim.id, error)
        throw error
      }
    }

    return this.setupPaymentIntent(orderId, claim.id, input.idempotencyKey, actor)
  }

  async processPaymentEvent(event: ProviderPaymentEvent): Promise<{ duplicate: boolean; orderId?: string }> {
    const claimed = await this.claimProviderEvent(event.provider, event.eventId, event.eventType, event.payload)
    if (!claimed) return { duplicate: true }

    try {
      const orderId = await this.db.$transaction(async (tx) => {
        const found = await tx.order.findFirst({ where: { paymentIntentId: event.paymentIntentId } })
        if (!found) throw new OrderDomainError("Payment event does not reference a known order", "UNKNOWN_PAYMENT", 404)
        const order = await this.lockOrder(tx, found.id)
        const actor: OrderActor = { type: "PROVIDER", id: event.provider }

        if (event.outcome === "succeeded") {
          if (order.financialStatus === "PAID" || order.financialStatus === "PARTIALLY_REFUNDED" || order.financialStatus === "REFUNDED") {
            return order.id
          }
          const held = await tx.inventoryReservation.count({ where: { orderId: order.id, status: "HELD" } })
          if (!held) {
            const exceptional = await tx.order.update({
              where: { id: order.id },
              data: {
                workflowState: "EXCEPTION",
                lastException: "Payment succeeded after inventory reservations were released; merchant reconciliation is required",
                paymentStatus: "succeeded_without_inventory",
                version: { increment: 1 },
              },
            })
            await this.appendAudit(tx, exceptional, "LATE_PAYMENT_EXCEPTION", actor, event.eventId, stateSnapshot(order), stateSnapshot(exceptional))
            await this.enqueue(tx, order.id, "order.exception", { orderId: order.id, code: "PAID_WITHOUT_INVENTORY" })
            return order.id
          }
          await this.commitReservations(tx, order.id)
          const nextState = transitionOrder(order.workflowState as OrderWorkflowState, "PAYMENT_SUCCEEDED")
          const paid = await tx.order.update({
            where: { id: order.id },
            data: {
              workflowState: nextState as PrismaOrderWorkflowState,
              financialStatus: "PAID",
              paymentStatus: "completed",
              paidAt: this.now(),
              lastException: null,
              version: { increment: 1 },
            },
          })
          if (order.customerId) {
            await tx.customer.update({
              where: { id: order.customerId },
              data: { totalOrders: { increment: 1 }, totalSpent: { increment: order.totalPrice } },
            })
          }
          const quote = await tx.checkoutQuote.findUnique({ where: { orderId: order.id } })
          if (quote) await tx.cartItem.deleteMany({ where: { cartId: quote.cartId } })
          await this.appendAudit(tx, paid, "PAYMENT_SUCCEEDED", actor, event.eventId, stateSnapshot(order), stateSnapshot(paid))
          await this.enqueue(tx, order.id, "order.paid", { orderId: order.id, paymentIntentId: event.paymentIntentId })
        } else {
          if (order.financialStatus === "PAID") return order.id
          await this.releaseReservations(tx, order.id, "RELEASED")
          const failed = await tx.order.update({
            where: { id: order.id },
            data: {
              workflowState: "PAYMENT_FAILED",
              paymentStatus: event.outcome,
              lastException: null,
              version: { increment: 1 },
            },
          })
          await this.appendAudit(tx, failed, "PAYMENT_FAILED", actor, event.eventId, stateSnapshot(order), stateSnapshot(failed), {
            outcome: event.outcome,
          })
          await this.enqueue(tx, order.id, "payment.failed", { orderId: order.id, paymentIntentId: event.paymentIntentId })
        }
        return order.id
      })
      await this.succeedProviderEvent(event.provider, event.eventId)
      return { duplicate: false, orderId }
    } catch (error) {
      await this.failProviderEvent(event.provider, event.eventId, error)
      throw error
    }
  }

  async cancelOrder(orderId: string, idempotencyKey: string, actor: OrderActor) {
    const claim = await this.claimCommand("CANCEL_ORDER", idempotencyKey, { orderId }, actor, orderId)
    if (claim.status === "SUCCEEDED") return claim.result
    const current = await this.db.order.findUniqueOrThrow({ where: { id: orderId } })
    assertCommandPermission(actor, "cancel", current.customerId)
    transitionOrder(current.workflowState as OrderWorkflowState, "CANCEL_REQUESTED")

    try {
      await this.db.$transaction(async (tx) => {
        const order = await this.lockOrder(tx, orderId)
        const pending = await tx.order.update({
          where: { id: order.id },
          data: { workflowState: "CANCELLATION_PENDING", version: { increment: 1 } },
        })
        await this.appendAudit(tx, pending, "CANCEL_REQUESTED", actor, idempotencyKey, stateSnapshot(order), stateSnapshot(pending))
      })

      if (current.paymentIntentId && current.paymentStatus !== "failed" && current.paymentStatus !== "cancelled") {
        await this.providers.payment.cancelIntent(current.paymentIntentId, `${idempotencyKey}:payment-cancel`)
      }

      const cancelled = await this.db.$transaction(async (tx) => {
        const order = await this.lockOrder(tx, orderId)
        if (order.financialStatus === "PAID" || order.fulfillmentStatus !== "UNFULFILLED") {
          throw new OrderDomainError("Paid or fulfilled orders require the merchant refund workflow", "CANCELLATION_REQUIRES_REFUND")
        }
        await this.releaseReservations(tx, order.id, "RELEASED")
        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            workflowState: "CANCELLED",
            status: "CANCELLED",
            financialStatus: "VOIDED",
            paymentStatus: "cancelled",
            cancelledAt: this.now(),
            version: { increment: 1 },
          },
        })
        await this.appendAudit(tx, updated, "ORDER_CANCELLED", actor, idempotencyKey, stateSnapshot(order), stateSnapshot(updated))
        await this.enqueue(tx, order.id, "order.cancelled", { orderId: order.id })
        return updated
      })
      const result = { orderId, workflowState: cancelled.workflowState }
      await this.completeCommand(claim.id, result)
      return result
    } catch (error) {
      await this.db.order.update({
        where: { id: orderId },
        data: { workflowState: "EXCEPTION", lastException: error instanceof Error ? error.message : "Cancellation failed" },
      }).catch(() => undefined)
      await this.failCommand(claim.id, error)
      throw error
    }
  }

  async recoverOrder(orderId: string, idempotencyKey: string, actor: OrderActor) {
    const claim = await this.claimCommand("RECOVER_ORDER", idempotencyKey, { orderId }, actor, orderId)
    if (claim.status === "SUCCEEDED") return claim.result
    const current = await this.db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } })
    assertCommandPermission(actor, "recover", current.customerId)
    if (current.financialStatus !== "PENDING") {
      throw new OrderDomainError("Only unpaid orders can be recovered", "INVALID_ORDER_TRANSITION")
    }
    transitionOrder(current.workflowState as OrderWorkflowState, "RECOVERED")

    const expiresAt = new Date(this.now().getTime() + 15 * 60 * 1000)
    await this.db.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId)
      const held = await tx.inventoryReservation.count({ where: { orderId, status: "HELD" } })
      if (!held) await this.reserveExistingOrder(tx, order, current.items, expiresAt)
      const recovered = await tx.order.update({
        where: { id: orderId },
        data: {
          workflowState: "AWAITING_PAYMENT",
          reservationExpiresAt: expiresAt,
          lastException: null,
          version: { increment: 1 },
        },
      })
      await this.appendAudit(tx, recovered, "ORDER_RECOVERED", actor, idempotencyKey, stateSnapshot(order), stateSnapshot(recovered))
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return this.setupPaymentIntent(orderId, claim.id, `${idempotencyKey}:recovery`, actor)
  }

  async createFulfillment(input: FulfillmentInput, actor: OrderActor) {
    const claim = await this.claimCommand("CREATE_FULFILLMENT", input.idempotencyKey, input, actor, input.orderId)
    if (claim.status === "SUCCEEDED") return claim.result
    const order = await this.db.order.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { items: true, fulfillments: { include: { items: true } } },
    })
    assertCommandPermission(actor, "fulfill", order.customerId)
    if (order.financialStatus !== "PAID" && order.financialStatus !== "PARTIALLY_REFUNDED") {
      throw new OrderDomainError("Only paid orders can be fulfilled", "ORDER_NOT_PAID")
    }
    this.assertFulfillmentQuantities(order.items, order.fulfillments.flatMap((item) => item.items), input.items)
    if (!order.shippingQuoteId) throw new OrderDomainError("Order has no carrier quote", "MISSING_SHIPPING_QUOTE")

    let shipment: ShipmentResult
    try {
      shipment = await this.providers.shipping.purchaseShipment({
        idempotencyKey: `${input.idempotencyKey}:shipment`,
        quoteId: order.shippingQuoteId,
        orderId: order.id,
        lines: input.items,
      })
    } catch (error) {
      await this.failCommand(claim.id, error)
      throw error
    }

    const result = await this.db.$transaction(async (tx) => {
      const locked = await this.lockOrder(tx, order.id)
      const fresh = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true, fulfillments: { include: { items: true } } },
      })
      this.assertFulfillmentQuantities(fresh.items, fresh.fulfillments.flatMap((item) => item.items), input.items)
      const fulfillment = await tx.fulfillment.create({
        data: {
          orderId: order.id,
          idempotencyKey: input.idempotencyKey,
          provider: this.providers.shipping.name,
          providerShipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          trackingUrl: shipment.trackingUrl,
          carrier: shipment.carrier,
          status: shipment.status,
          shippedAt: shipment.status === "SHIPPED" || shipment.status === "IN_TRANSIT" ? this.now() : null,
          items: { create: input.items },
        },
        include: { items: true },
      })
      const fulfilledByItem = new Map<string, number>()
      for (const existing of fresh.fulfillments.flatMap((item) => item.items).concat(fulfillment.items)) {
        fulfilledByItem.set(existing.orderItemId, (fulfilledByItem.get(existing.orderItemId) ?? 0) + existing.quantity)
      }
      const fullyFulfilled = fresh.items.every((item) => (fulfilledByItem.get(item.id) ?? 0) === item.quantity)
      const event = fullyFulfilled ? "FULFILLED" : "PARTIALLY_FULFILLED"
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: fullyFulfilled ? "FULFILLED" : "PARTIALLY_FULFILLED",
          workflowState: transitionOrder(locked.workflowState as OrderWorkflowState, event) as PrismaOrderWorkflowState,
          version: { increment: 1 },
        },
      })
      await this.appendAudit(tx, updated, `ORDER_${event}`, actor, input.idempotencyKey, stateSnapshot(locked), stateSnapshot(updated), {
        fulfillmentId: fulfillment.id,
        shipmentId: shipment.id,
        items: input.items,
      })
      await this.enqueue(tx, order.id, fullyFulfilled ? "order.fulfilled" : "order.partially_fulfilled", {
        orderId: order.id,
        fulfillmentId: fulfillment.id,
      })
      return { orderId: order.id, fulfillmentId: fulfillment.id, fulfillmentStatus: updated.fulfillmentStatus }
    })
    await this.completeCommand(claim.id, result)
    return result
  }

  async processDeliveryEvent(input: {
    provider: string
    eventId: string
    eventType: string
    shipmentId: string
    status: "PENDING" | "SHIPPED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED"
    trackingNumber?: string
    payload: JsonRecord
  }) {
    const claimed = await this.claimProviderEvent(input.provider, input.eventId, input.eventType, input.payload)
    if (!claimed) return { duplicate: true }
    try {
      const result = await this.db.$transaction(async (tx) => {
        const fulfillment = await tx.fulfillment.findFirst({ where: { providerShipmentId: input.shipmentId } })
        if (!fulfillment) throw new OrderDomainError("Delivery event references an unknown shipment", "UNKNOWN_SHIPMENT", 404)
        const order = await this.lockOrder(tx, fulfillment.orderId)
        await tx.fulfillment.update({
          where: { id: fulfillment.id },
          data: {
            status: input.status,
            trackingNumber: input.trackingNumber ?? fulfillment.trackingNumber,
            deliveredAt: input.status === "DELIVERED" ? this.now() : fulfillment.deliveredAt,
          },
        })
        const outstanding = await tx.fulfillment.count({
          where: { orderId: order.id, status: { not: "DELIVERED" } },
        })
        let updated = order
        if (input.status === "DELIVERED" && outstanding === 0) {
          updated = await tx.order.update({
            where: { id: order.id },
            data: {
              workflowState: transitionOrder(order.workflowState as OrderWorkflowState, "DELIVERED") as PrismaOrderWorkflowState,
              deliveredAt: this.now(),
              version: { increment: 1 },
            },
          })
        }
        await this.appendAudit(tx, updated, `DELIVERY_${input.status}`, { type: "PROVIDER", id: input.provider }, input.eventId, stateSnapshot(order), stateSnapshot(updated), {
          fulfillmentId: fulfillment.id,
          shipmentId: input.shipmentId,
        })
        await this.enqueue(tx, order.id, input.status === "DELIVERED" ? "order.delivered" : "order.delivery_updated", {
          orderId: order.id,
          fulfillmentId: fulfillment.id,
          status: input.status,
        })
        return { duplicate: false, orderId: order.id }
      })
      await this.succeedProviderEvent(input.provider, input.eventId)
      return result
    } catch (error) {
      await this.failProviderEvent(input.provider, input.eventId, error)
      throw error
    }
  }

  async refundOrder(orderId: string, amountCents: number, reason: string, idempotencyKey: string, actor: OrderActor) {
    const claim = await this.claimCommand("REFUND_ORDER", idempotencyKey, { orderId, amountCents, reason }, actor, orderId)
    if (claim.status === "SUCCEEDED") return claim.result
    const order = await this.db.order.findUniqueOrThrow({ where: { id: orderId }, include: { refunds: true } })
    assertCommandPermission(actor, "refund", order.customerId)
    if (!order.paymentIntentId || !["PAID", "PARTIALLY_REFUNDED"].includes(order.financialStatus)) {
      throw new OrderDomainError("Order does not have a refundable payment", "ORDER_NOT_REFUNDABLE")
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new OrderDomainError("Refund amount must be positive cents", "INVALID_REFUND_AMOUNT", 400)
    }
    const alreadyAllocated = order.refunds
      .filter((refund) => refund.status !== "FAILED")
      .reduce((sum, refund) => sum + cents(refund.amount), 0)
    if (alreadyAllocated + amountCents > cents(order.totalPrice)) {
      throw new OrderDomainError("Refund exceeds the remaining paid amount", "REFUND_EXCEEDS_PAYMENT")
    }

    await this.db.$transaction(async (tx) => {
      const locked = await this.lockOrder(tx, orderId)
      await tx.orderRefund.create({
        data: {
          orderId,
          idempotencyKey,
          provider: this.providers.payment.name,
          amount: decimalAmount(amountCents),
          currency: order.currency,
          reason,
          requestedBy: actor.id ?? "merchant",
        },
      })
      await this.appendAudit(tx, locked, "REFUND_REQUESTED", actor, idempotencyKey, stateSnapshot(locked), stateSnapshot(locked), {
        amountCents,
        reason,
      })
    })

    let providerResult: RefundResult
    try {
      providerResult = await this.providers.payment.refund({
        idempotencyKey: `${idempotencyKey}:provider`,
        paymentIntentId: order.paymentIntentId,
        amountCents,
        reason,
      })
    } catch (error) {
      await this.db.orderRefund.update({
        where: { idempotencyKey },
        data: { status: "FAILED", providerError: error instanceof Error ? error.message : "Provider refund failed" },
      })
      await this.failCommand(claim.id, error)
      throw error
    }

    const result = await this.applyRefundResult(orderId, idempotencyKey, providerResult, actor)
    await this.completeCommand(claim.id, result)
    return result
  }

  async processRefundEvent(input: {
    provider: string
    eventId: string
    eventType: string
    providerRefundId: string
    status: "pending" | "succeeded" | "failed"
    failureReason?: string
    payload: JsonRecord
  }) {
    const claimed = await this.claimProviderEvent(input.provider, input.eventId, input.eventType, input.payload)
    if (!claimed) return { duplicate: true }
    try {
      const refund = await this.db.orderRefund.findFirst({ where: { providerRefundId: input.providerRefundId } })
      if (!refund) throw new OrderDomainError("Refund event references an unknown refund", "UNKNOWN_REFUND", 404)
      const result = await this.applyRefundResult(
        refund.orderId,
        refund.idempotencyKey,
        { id: input.providerRefundId, status: input.status, failureReason: input.failureReason },
        { type: "PROVIDER", id: input.provider },
      )
      await this.succeedProviderEvent(input.provider, input.eventId)
      return { duplicate: false, ...result }
    } catch (error) {
      await this.failProviderEvent(input.provider, input.eventId, error)
      throw error
    }
  }

  async reconcileOrder(orderId: string, idempotencyKey: string, actor: OrderActor) {
    const claim = await this.claimCommand("RECONCILE_ORDER", idempotencyKey, { orderId }, actor, orderId)
    if (claim.status === "SUCCEEDED") return claim.result
    const current = await this.db.order.findUniqueOrThrow({ where: { id: orderId } })
    assertCommandPermission(actor, "reconcile", current.customerId)
    const paymentState: PaymentIntentState | null = current.paymentIntentId
      ? await this.providers.payment.retrieveIntent(current.paymentIntentId)
      : null

    const result = await this.db.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId)
      const issues: JsonRecord[] = []
      const repairs: JsonRecord[] = []
      const badInventory = await tx.$queryRaw<Array<{ id: string; quantity: number; reserved: number }>>(Prisma.sql`
        SELECT i.id, i.quantity, i.reserved
        FROM "Inventory" i
        WHERE i.id IN (
          SELECT r."inventoryId" FROM "InventoryReservation" r WHERE r."orderId" = ${orderId}
        ) AND (i.quantity < 0 OR i.reserved < 0 OR i.reserved > i.quantity)
        FOR UPDATE OF i
      `)
      if (badInventory.length) issues.push({ code: "INVALID_INVENTORY_BALANCE", inventoryIds: badInventory.map((row) => row.id) })

      const overfulfilled = await tx.$queryRaw<Array<{ orderItemId: string; ordered: number; fulfilled: bigint }>>(Prisma.sql`
        SELECT oi.id AS "orderItemId", oi.quantity AS ordered, COALESCE(SUM(fi.quantity), 0) AS fulfilled
        FROM "OrderItem" oi
        LEFT JOIN "FulfillmentItem" fi ON fi."orderItemId" = oi.id
        WHERE oi."orderId" = ${orderId}
        GROUP BY oi.id
        HAVING COALESCE(SUM(fi.quantity), 0) > oi.quantity
      `)
      if (overfulfilled.length) issues.push({ code: "OVERFULFILLED", orderItemIds: overfulfilled.map((row) => row.orderItemId) })

      let updated = order
      if (paymentState?.status === "succeeded" && order.financialStatus === "PENDING") {
        const held = await tx.inventoryReservation.count({ where: { orderId, status: "HELD" } })
        if (held) {
          await this.commitReservations(tx, orderId)
          updated = await tx.order.update({
            where: { id: orderId },
            data: {
              workflowState: "PAID",
              financialStatus: "PAID",
              paymentStatus: "completed",
              paidAt: this.now(),
              lastException: null,
              version: { increment: 1 },
            },
          })
          repairs.push({ code: "APPLIED_MISSING_PAYMENT_EVENT", paymentIntentId: paymentState.id })
        } else {
          issues.push({ code: "PAID_WITHOUT_HELD_INVENTORY", paymentIntentId: paymentState.id })
          updated = await tx.order.update({
            where: { id: orderId },
            data: { workflowState: "EXCEPTION", lastException: "Provider shows paid but no held inventory exists", version: { increment: 1 } },
          })
        }
      } else if (
        paymentState &&
        (paymentState.status === "failed" || paymentState.status === "cancelled") &&
        order.financialStatus === "PENDING" &&
        order.workflowState === "AWAITING_PAYMENT"
      ) {
        await this.releaseReservations(tx, orderId, "RELEASED")
        updated = await tx.order.update({
          where: { id: orderId },
          data: { workflowState: "PAYMENT_FAILED", paymentStatus: paymentState.status, version: { increment: 1 } },
        })
        repairs.push({ code: "APPLIED_MISSING_PAYMENT_FAILURE", paymentIntentId: paymentState.id })
      } else if (paymentState?.status !== "succeeded" && order.financialStatus === "PAID") {
        issues.push({ code: "LOCAL_PAYMENT_PROVIDER_MISMATCH", providerStatus: paymentState?.status ?? "missing" })
      }

      const status = issues.length ? "ISSUES_FOUND" : repairs.length ? "REPAIRED" : "CONSISTENT"
      const run = await tx.reconciliationRun.create({
        data: {
          orderId,
          actorType: actor.type,
          actorId: actor.id,
          status,
          issues: asJson(issues),
          repairs: asJson(repairs),
        },
      })
      await this.appendAudit(tx, updated, "ORDER_RECONCILED", actor, idempotencyKey, stateSnapshot(order), stateSnapshot(updated), {
        reconciliationRunId: run.id,
        status,
        issues,
        repairs,
      })
      if (issues.length) await this.enqueue(tx, orderId, "order.reconciliation_issue", { orderId, runId: run.id, issues })
      return { orderId, reconciliationRunId: run.id, status, issues, repairs }
    })
    await this.completeCommand(claim.id, result)
    return result
  }

  async addOrderNote(orderId: string, note: string, idempotencyKey: string, actor: OrderActor) {
    const claim = await this.claimCommand("ADD_ORDER_NOTE", idempotencyKey, { orderId, note }, actor, orderId)
    if (claim.status === "SUCCEEDED") return claim.result
    const current = await this.db.order.findUniqueOrThrow({ where: { id: orderId } })
    assertCommandPermission(actor, "reconcile", current.customerId)
    const result = await this.db.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId)
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { notes: note, version: { increment: 1 } },
      })
      await this.appendAudit(tx, updated, "ORDER_NOTE_UPDATED", actor, idempotencyKey, stateSnapshot(order), stateSnapshot(updated), {
        previousNoteHash: sha256(order.notes ?? ""),
        noteHash: sha256(note),
      })
      return { orderId, updated: true }
    })
    await this.completeCommand(claim.id, result)
    return result
  }

  async archiveOrder(orderId: string, idempotencyKey: string, actor: OrderActor) {
    if (actor.type !== "MERCHANT") {
      throw new OrderDomainError("Only merchants can archive orders", "ORDER_FORBIDDEN", 403)
    }
    const claim = await this.claimCommand("ARCHIVE_ORDER", idempotencyKey, { orderId }, actor, orderId)
    if (claim.status === "SUCCEEDED") return claim.result
    const result = await this.db.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId)
      if (!["CANCELLED", "REFUNDED", "DELIVERED"].includes(order.workflowState)) {
        throw new OrderDomainError("Only terminal orders can be archived", "INVALID_ORDER_TRANSITION")
      }
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: "ARCHIVED", version: { increment: 1 } },
      })
      await this.appendAudit(tx, updated, "ORDER_ARCHIVED", actor, idempotencyKey, stateSnapshot(order), stateSnapshot(updated))
      return { orderId, status: updated.status }
    })
    await this.completeCommand(claim.id, result)
    return result
  }

  async expireReservations(limit = 100) {
    const due = await this.db.inventoryReservation.findMany({
      where: { status: "HELD", expiresAt: { lte: this.now() } },
      distinct: ["orderId"],
      select: { orderId: true },
      take: Math.min(Math.max(limit, 1), 500),
    })
    const expired: string[] = []
    for (const candidate of due) {
      await this.db.$transaction(async (tx) => {
        const order = await this.lockOrder(tx, candidate.orderId)
        if (order.financialStatus !== "PENDING" || order.workflowState === "CANCELLED") return
        await this.releaseReservations(tx, order.id, "EXPIRED")
        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            workflowState: "PAYMENT_FAILED",
            paymentStatus: "reservation_expired",
            lastException: "Inventory reservation expired before payment confirmation",
            version: { increment: 1 },
          },
        })
        await this.appendAudit(
          tx,
          updated,
          "INVENTORY_RESERVATION_EXPIRED",
          { type: "SYSTEM", id: "reservation-expiry" },
          null,
          stateSnapshot(order),
          stateSnapshot(updated),
        )
        await this.enqueue(tx, order.id, "order.reservation_expired", { orderId: order.id })
        expired.push(order.id)
      })
    }
    return { expired }
  }

  private async setupPaymentIntent(orderId: string, commandId: string, idempotencyKey: string, actor: OrderActor) {
    const order = await this.db.order.findUniqueOrThrow({ where: { id: orderId } })
    try {
      const intent = await this.providers.payment.createIntent({
        idempotencyKey: `${idempotencyKey}:payment`,
        amountCents: cents(order.totalPrice),
        currency: order.currency,
        orderId,
      })
      await this.db.$transaction(async (tx) => {
        const locked = await this.lockOrder(tx, orderId)
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentIntentId: intent.id,
            paymentStatus: intent.status,
            workflowState: "AWAITING_PAYMENT",
            lastException: null,
            version: { increment: 1 },
          },
        })
        await this.appendAudit(tx, updated, "PAYMENT_INTENT_CREATED", actor, idempotencyKey, stateSnapshot(locked), stateSnapshot(updated), {
          provider: this.providers.payment.name,
          paymentIntentId: intent.id,
        })
      })
      const result = { orderId, clientSecret: intent.clientSecret, paymentIntentId: intent.id }
      await this.completeCommand(commandId, result)
      return result
    } catch (error) {
      await this.db.$transaction(async (tx) => {
        const locked = await this.lockOrder(tx, orderId)
        const exceptional = await tx.order.update({
          where: { id: orderId },
          data: {
            workflowState: "EXCEPTION",
            lastException: error instanceof Error ? error.message : "Payment provider failed",
            version: { increment: 1 },
          },
        })
        await this.appendAudit(tx, exceptional, "PAYMENT_SETUP_EXCEPTION", actor, idempotencyKey, stateSnapshot(locked), stateSnapshot(exceptional))
      }).catch(() => undefined)
      await this.failCommand(commandId, error)
      throw error
    }
  }

  private async applyRefundResult(orderId: string, idempotencyKey: string, result: RefundResult, actor: OrderActor) {
    return this.db.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, orderId)
      const status = result.status === "succeeded" ? "SUCCEEDED" : result.status === "failed" ? "FAILED" : "PROCESSING"
      const refund = await tx.orderRefund.update({
        where: { idempotencyKey },
        data: {
          providerRefundId: result.id,
          status,
          providerError: result.failureReason,
          completedAt: result.status === "succeeded" ? this.now() : null,
        },
      })
      let updated = order
      if (result.status === "succeeded") {
        const succeeded = await tx.orderRefund.findMany({ where: { orderId, status: "SUCCEEDED" } })
        const refundedCents = succeeded.reduce((sum, item) => sum + cents(item.amount), 0)
        const full = refundedCents >= cents(order.totalPrice)
        updated = await tx.order.update({
          where: { id: orderId },
          data: {
            financialStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED",
            workflowState: full ? "REFUNDED" : "PARTIALLY_REFUNDED",
            version: { increment: 1 },
          },
        })
        if (order.customerId) {
          await tx.customer.update({
            where: { id: order.customerId },
            data: { totalSpent: { decrement: refund.amount } },
          })
        }
        await this.enqueue(tx, orderId, full ? "order.refunded" : "order.partially_refunded", {
          orderId,
          refundId: refund.id,
          amount: refund.amount.toString(),
        })
      }
      await this.appendAudit(tx, updated, `REFUND_${status}`, actor, idempotencyKey, stateSnapshot(order), stateSnapshot(updated), {
        refundId: refund.id,
        providerRefundId: result.id,
        failureReason: result.failureReason,
      })
      return { orderId, refundId: refund.id, refundStatus: refund.status, financialStatus: updated.financialStatus }
    })
  }

  private assertFulfillmentQuantities(
    orderItems: Array<Pick<OrderItem, "id" | "quantity">>,
    existing: Array<{ orderItemId: string; quantity: number }>,
    requested: Array<{ orderItemId: string; quantity: number }>,
  ): void {
    if (!requested.length) throw new OrderDomainError("Fulfillment must contain items", "EMPTY_FULFILLMENT", 400)
    const ordered = new Map(orderItems.map((item) => [item.id, item.quantity]))
    const fulfilled = new Map<string, number>()
    for (const item of existing) fulfilled.set(item.orderItemId, (fulfilled.get(item.orderItemId) ?? 0) + item.quantity)
    for (const item of requested) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new OrderDomainError("Fulfillment quantities must be positive integers", "INVALID_QUANTITY", 400)
      }
      const orderedQuantity = ordered.get(item.orderItemId)
      if (!orderedQuantity) throw new OrderDomainError("Fulfillment item is not part of the order", "INVALID_FULFILLMENT_ITEM", 400)
      const total = (fulfilled.get(item.orderItemId) ?? 0) + item.quantity
      if (total > orderedQuantity) throw new OrderDomainError("Fulfillment exceeds the ordered quantity", "OVERFULFILLMENT")
      fulfilled.set(item.orderItemId, total)
    }
  }

  private async reserveInventory(
    tx: Transaction,
    order: Order & { items: OrderItem[] },
    lines: QuoteLineSnapshot[],
    expiresAt: Date,
  ): Promise<void> {
    const lineByVariant = new Map(lines.map((line) => [line.variantId, line]))
    for (const item of [...order.items].sort((left, right) => (left.variantId ?? "").localeCompare(right.variantId ?? ""))) {
      if (!item.variantId || !lineByVariant.has(item.variantId)) {
        throw new OrderDomainError("Order item is not inventory tracked", "UNTRACKED_ORDER_ITEM", 400)
      }
      await this.allocateInventory(tx, order.id, item, item.quantity, expiresAt)
    }
  }

  private async reserveExistingOrder(tx: Transaction, order: Order, items: OrderItem[], expiresAt: Date): Promise<void> {
    for (const item of [...items].sort((left, right) => (left.variantId ?? "").localeCompare(right.variantId ?? ""))) {
      if (!item.variantId) throw new OrderDomainError("Order item is not inventory tracked", "UNTRACKED_ORDER_ITEM", 400)
      await this.allocateInventory(tx, order.id, item, item.quantity, expiresAt)
    }
  }

  private async allocateInventory(tx: Transaction, orderId: string, item: OrderItem, quantity: number, expiresAt: Date) {
    const rows = await tx.$queryRaw<InventoryRow[]>(Prisma.sql`
      SELECT id, "variantId", quantity, reserved
      FROM "Inventory"
      WHERE "variantId" = ${item.variantId!}
      ORDER BY "locationId", id
      FOR UPDATE
    `)
    let remaining = quantity
    for (const row of rows) {
      const allocation = Math.min(remaining, row.quantity - row.reserved)
      if (allocation <= 0) continue
      await tx.inventory.update({ where: { id: row.id }, data: { reserved: { increment: allocation } } })
      await tx.inventoryReservation.upsert({
        where: { orderItemId_inventoryId: { orderItemId: item.id, inventoryId: row.id } },
        update: { quantity: allocation, status: "HELD", expiresAt, releasedAt: null, committedAt: null },
        create: { orderId, orderItemId: item.id, inventoryId: row.id, quantity: allocation, expiresAt },
      })
      remaining -= allocation
      if (!remaining) break
    }
    if (remaining) {
      throw new OrderDomainError(`Insufficient inventory for ${item.title}`, "INSUFFICIENT_INVENTORY", 409)
    }
    await this.refreshVariantAvailability(tx, [item.variantId!])
  }

  private async commitReservations(tx: Transaction, orderId: string): Promise<void> {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, status: "HELD" },
      orderBy: { inventoryId: "asc" },
    })
    const variantIds = new Set<string>()
    for (const reservation of reservations) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Inventory" WHERE id = ${reservation.inventoryId} FOR UPDATE`)
      const changed = await tx.inventory.updateMany({
        where: { id: reservation.inventoryId, quantity: { gte: reservation.quantity }, reserved: { gte: reservation.quantity } },
        data: { quantity: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity } },
      })
      if (changed.count !== 1) {
        throw new OrderDomainError("Reserved inventory is no longer available", "INVENTORY_COMMIT_FAILED")
      }
      const inventory = await tx.inventory.findUniqueOrThrow({ where: { id: reservation.inventoryId } })
      variantIds.add(inventory.variantId)
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: "COMMITTED", committedAt: this.now() },
      })
    }
    await this.refreshVariantAvailability(tx, Array.from(variantIds))
  }

  private async releaseReservations(tx: Transaction, orderId: string, status: "RELEASED" | "EXPIRED") {
    const reservations = await tx.inventoryReservation.findMany({ where: { orderId, status: "HELD" } })
    const variantIds = new Set<string>()
    for (const reservation of reservations) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Inventory" WHERE id = ${reservation.inventoryId} FOR UPDATE`)
      const changed = await tx.inventory.updateMany({
        where: { id: reservation.inventoryId, reserved: { gte: reservation.quantity } },
        data: { reserved: { decrement: reservation.quantity } },
      })
      if (changed.count !== 1) throw new OrderDomainError("Inventory reservation balance is corrupt", "INVENTORY_RELEASE_FAILED")
      const inventory = await tx.inventory.findUniqueOrThrow({ where: { id: reservation.inventoryId } })
      variantIds.add(inventory.variantId)
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status, releasedAt: this.now() },
      })
    }
    await this.refreshVariantAvailability(tx, Array.from(variantIds))
  }

  private async refreshVariantAvailability(tx: Transaction, variantIds: string[]) {
    for (const variantId of Array.from(new Set(variantIds))) {
      const aggregate = await tx.inventory.aggregate({
        where: { variantId },
        _sum: { quantity: true, reserved: true },
      })
      const available = Math.max(0, (aggregate._sum.quantity ?? 0) - (aggregate._sum.reserved ?? 0))
      await tx.variant.update({ where: { id: variantId }, data: { inventoryQuantity: available } })
    }
  }

  private async appendAudit(
    tx: Transaction,
    order: Order,
    eventType: string,
    actor: OrderActor,
    commandKey: string | null,
    beforeState: JsonRecord,
    afterState: JsonRecord,
    metadata?: JsonRecord,
  ) {
    const previous = await tx.orderAudit.findFirst({ where: { orderId: order.id }, orderBy: { sequence: "desc" } })
    const createdAt = this.now()
    const sequence = (previous?.sequence ?? 0) + 1
    const hashInput = {
      orderId: order.id,
      sequence,
      eventType,
      actorType: actor.type,
      actorId: actor.id,
      commandKey,
      beforeState,
      afterState,
      metadata: metadata ?? null,
      previousHash: previous?.eventHash ?? null,
      createdAt: createdAt.toISOString(),
    }
    const eventHash = sha256(hashInput)
    await tx.orderAudit.create({
      data: {
        orderId: order.id,
        sequence,
        eventType,
        actorType: actor.type,
        actorId: actor.id,
        commandKey,
        beforeState: asJson(beforeState),
        afterState: asJson(afterState),
        ...(metadata ? { metadata: asJson(metadata) } : {}),
        previousHash: previous?.eventHash,
        eventHash,
        createdAt,
      },
    })
    await tx.order.update({ where: { id: order.id }, data: { auditHeadHash: eventHash } })
  }

  private enqueue(tx: Transaction, orderId: string, eventType: string, payload: JsonRecord) {
    return tx.orderOutboxEvent.create({
      data: { orderId, aggregateId: orderId, eventType, payload: asJson(payload) },
    })
  }

  private async lockOrder(tx: Transaction, orderId: string): Promise<Order> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`)
    if (!rows.length) throw new OrderDomainError("Order not found", "ORDER_NOT_FOUND", 404)
    return tx.order.findUniqueOrThrow({ where: { id: orderId } })
  }

  private async lockQuote(tx: Transaction, quoteId: string): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM "CheckoutQuote" WHERE id = ${quoteId} FOR UPDATE`)
    if (!rows.length) throw new OrderDomainError("Checkout quote not found", "QUOTE_NOT_FOUND", 404)
  }

  private async claimCommand(
    commandType: string,
    idempotencyKey: string,
    request: unknown,
    actor: OrderActor,
    orderId?: string,
  ): Promise<CommandClaim> {
    if (!idempotencyKey) throw new OrderDomainError("Idempotency-Key is required", "IDEMPOTENCY_REQUIRED", 400)
    const requestHash = sha256(request)
    try {
      const command = await this.db.orderCommand.create({
        data: { idempotencyKey, commandType, requestHash, actorType: actor.type, actorId: actor.id, orderId },
      })
      return { ...command, replayed: false }
    } catch (error) {
      if (!isPrismaCode(error, "P2002")) throw error
      const command = await this.db.orderCommand.findUniqueOrThrow({ where: { idempotencyKey } })
      if (command.commandType !== commandType || command.requestHash !== requestHash) {
        throw new OrderDomainError("Idempotency key was reused with a different command", "IDEMPOTENCY_CONFLICT")
      }
      if (command.status === "FAILED") {
        throw new OrderDomainError(command.error ?? "The original command failed", "IDEMPOTENT_COMMAND_FAILED")
      }
      return { ...command, replayed: true }
    }
  }

  private completeCommand(commandId: string, result: unknown) {
    return this.db.orderCommand.update({
      where: { id: commandId },
      data: { status: "SUCCEEDED", result: asJson(result), completedAt: this.now(), error: null },
    })
  }

  private failCommand(commandId: string, error: unknown) {
    return this.db.orderCommand.update({
      where: { id: commandId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown command failure",
        completedAt: this.now(),
      },
    }).catch(() => undefined)
  }

  private async claimProviderEvent(provider: string, eventId: string, eventType: string, payload: JsonRecord): Promise<boolean> {
    const payloadHash = sha256(payload)
    try {
      await this.db.providerEvent.create({
        data: { provider, eventId, eventType, payloadHash, payload: asJson(payload) },
      })
      return true
    } catch (error) {
      if (!isPrismaCode(error, "P2002")) throw error
      const existing = await this.db.providerEvent.findUniqueOrThrow({ where: { provider_eventId: { provider, eventId } } })
      if (existing.payloadHash !== payloadHash || existing.eventType !== eventType) {
        throw new OrderDomainError("Provider event id was reused with different content", "PROVIDER_EVENT_CONFLICT", 400)
      }
      if (existing.status === "SUCCEEDED" || existing.status === "PROCESSING") return false
      await this.db.providerEvent.update({
        where: { provider_eventId: { provider, eventId } },
        data: { status: "PROCESSING", error: null },
      })
      return true
    }
  }

  private succeedProviderEvent(provider: string, eventId: string) {
    return this.db.providerEvent.update({
      where: { provider_eventId: { provider, eventId } },
      data: { status: "SUCCEEDED", processedAt: this.now(), error: null },
    })
  }

  private failProviderEvent(provider: string, eventId: string, error: unknown) {
    return this.db.providerEvent.update({
      where: { provider_eventId: { provider, eventId } },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown provider event failure" },
    }).catch(() => undefined)
  }
}
