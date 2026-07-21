import { PrismaClient } from "@prisma/client"
import { OrderOperationsService } from "@/lib/order/service"
import { enqueuePartnerEvent, processPartnerDeliveries } from "@/lib/order/partner-outbox"
import type {
  OrderProviders,
  PaymentProvider,
  ShippingProvider,
  TaxProvider,
} from "@/lib/order/providers"

const databaseUrl = process.env.ORDER_TEST_DATABASE_URL
const describeDatabase = databaseUrl ? describe : describe.skip
const fixedNow = new Date("2026-07-20T12:00:00.000Z")

class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake-payment"
  readonly byKey = new Map<string, { id: string; clientSecret: string; status: string }>()
  readonly states = new Map<string, "pending" | "succeeded" | "failed" | "cancelled">()
  createCalls = 0
  refundCalls = 0

  async createIntent(input: Parameters<PaymentProvider["createIntent"]>[0]) {
    const replay = this.byKey.get(input.idempotencyKey)
    if (replay) return replay
    this.createCalls += 1
    const intent = { id: `pi_${this.createCalls}`, clientSecret: `secret_${this.createCalls}`, status: "requires_payment_method" }
    this.byKey.set(input.idempotencyKey, intent)
    this.states.set(intent.id, "pending")
    return intent
  }

  async cancelIntent(paymentIntentId: string) {
    this.states.set(paymentIntentId, "cancelled")
  }

  async refund(input: Parameters<PaymentProvider["refund"]>[0]) {
    this.refundCalls += 1
    return { id: `re_${input.idempotencyKey}`, status: "succeeded" as const }
  }

  async retrieveIntent(paymentIntentId: string) {
    return { id: paymentIntentId, status: this.states.get(paymentIntentId) ?? "pending" }
  }
}

class FakeTaxProvider implements TaxProvider {
  readonly name = "fake-tax"
  async quote(input: Parameters<TaxProvider["quote"]>[0]) {
    const taxable = input.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0) + input.shippingCents
    return {
      provider: this.name,
      quoteId: `tax_${input.idempotencyKey}`,
      amountCents: Math.round(taxable * 0.1),
      currency: input.currency,
      expiresAt: new Date(fixedNow.getTime() + 60 * 60 * 1_000),
    }
  }
}

class FakeShippingProvider implements ShippingProvider {
  readonly name = "fake-carrier"
  shipmentCalls = 0
  async quote(input: Parameters<ShippingProvider["quote"]>[0]) {
    return {
      provider: this.name,
      quoteId: `shipping_${input.idempotencyKey}`,
      service: input.service ?? "ground",
      amountCents: 500,
      currency: input.currency,
      expiresAt: new Date(fixedNow.getTime() + 60 * 60 * 1_000),
    }
  }
  async purchaseShipment(input: Parameters<ShippingProvider["purchaseShipment"]>[0]) {
    this.shipmentCalls += 1
    return {
      id: `shipment_${input.idempotencyKey}`,
      trackingNumber: `TRACK${this.shipmentCalls}`,
      carrier: "Test Carrier",
      status: "SHIPPED" as const,
    }
  }
  verifyWebhook() {
    return true
  }
}

describeDatabase("order operations database workflow", () => {
  const db = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : (null as unknown as PrismaClient)
  let payment: FakePaymentProvider
  let shipping: FakeShippingProvider
  let providers: OrderProviders
  let service: OrderOperationsService

  beforeAll(async () => {
    const parsed = new URL(databaseUrl!)
    if (!parsed.pathname.slice(1).endsWith("_test")) {
      throw new Error("ORDER_TEST_DATABASE_URL must name a database ending in _test")
    }
    await db.$connect()
  })

  beforeEach(async () => {
    await db.$executeRawUnsafe(`
      TRUNCATE TABLE
        "PartnerWebhookDelivery", "WebhookLog", "Webhook", "OrderOutboxEvent",
        "ProviderEvent", "ReconciliationRun", "OrderAudit", "OrderRefund", "OrderCommand",
        "InventoryReservation", "FulfillmentItem", "Fulfillment", "CheckoutQuote",
        "OrderTimeline", "OrderItem", "Order", "CartItem", "Cart", "Inventory", "Location",
        "Variant", "Product", "CustomerAccount", "Customer", "User"
      RESTART IDENTITY CASCADE
    `)
    payment = new FakePaymentProvider()
    shipping = new FakeShippingProvider()
    providers = { payment, shipping, tax: new FakeTaxProvider() }
    service = new OrderOperationsService(db, providers, () => new Date(fixedNow))
  })

  afterAll(() => db.$disconnect())

  async function seedCart(quantity = 2, inventoryQuantity = 5, suffix = "one") {
    const location = await db.location.upsert({
      where: { id: "warehouse" },
      update: {},
      create: {
        id: "warehouse",
        name: "Warehouse",
        address1: "1 Supply Way",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "US",
        isDefault: true,
      },
    })
    const product = await db.product.upsert({
      where: { slug: "widget" },
      update: {},
      create: { title: "Widget", slug: "widget", price: "10.00", status: "ACTIVE", tags: [], images: [] },
    })
    const variant = await db.variant.upsert({
      where: { id: "variant" },
      update: {},
      create: { id: "variant", productId: product.id, title: "Default", price: "10.00", inventoryQuantity },
    })
    await db.inventory.upsert({
      where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
      update: { quantity: inventoryQuantity, reserved: 0 },
      create: { variantId: variant.id, locationId: location.id, quantity: inventoryQuantity },
    })
    const cart = await db.cart.create({
      data: {
        sessionId: `session-${suffix}`,
        items: { create: { productId: product.id, variantId: variant.id, quantity } },
      },
    })
    return { cart, variant }
  }

  async function quoteAndPlace(suffix = "one", quantity = 2, inventoryQuantity = 5) {
    const { cart, variant } = await seedCart(quantity, inventoryQuantity, suffix)
    const actor = { type: "CUSTOMER", id: null, customerId: null } as const
    const quote = await service.quoteCheckout({
      idempotencyKey: `quote-${suffix}`,
      cartId: cart.id,
      shippingAddress: {
        address1: "2 Customer Street",
        city: "Brooklyn",
        state: "NY",
        postalCode: "11201",
        country: "US",
      },
    }, actor)
    const paymentSetup = await service.placeOrder({
      idempotencyKey: `place-${suffix}`,
      quoteId: quote.id,
      email: `${suffix}@example.com`,
      firstName: "Test",
      lastName: "Customer",
    }, actor)
    return { quote, paymentSetup, actor, variant }
  }

  it("reserves inventory and replays checkout without duplicate orders or intents", async () => {
    const { quote, paymentSetup, actor } = await quoteAndPlace()
    const replay = await service.placeOrder({
      idempotencyKey: "place-one",
      quoteId: quote.id,
      email: "one@example.com",
      firstName: "Test",
      lastName: "Customer",
    }, actor)
    expect(replay).toEqual(paymentSetup)
    expect(payment.createCalls).toBe(1)
    expect(await db.order.count()).toBe(1)
    expect(await db.inventory.findFirst()).toMatchObject({ quantity: 5, reserved: 2 })
    expect(await db.inventoryReservation.findFirst()).toMatchObject({ quantity: 2, status: "HELD" })
    const audits = await db.orderAudit.findMany({ orderBy: { sequence: "asc" } })
    expect(audits.map((entry) => entry.eventType)).toEqual(["ORDER_RESERVED", "PAYMENT_INTENT_CREATED"])
    expect(audits[1].previousHash).toBe(audits[0].eventHash)
  })

  it("commits stock once when Stripe sends a duplicate success event", async () => {
    const { paymentSetup } = await quoteAndPlace()
    const input = {
      provider: "stripe",
      eventId: "evt-paid",
      eventType: "payment_intent.succeeded",
      paymentIntentId: paymentSetup.paymentIntentId,
      outcome: "succeeded" as const,
      payload: { id: "evt-paid" },
    }
    await expect(service.processPaymentEvent(input)).resolves.toMatchObject({ duplicate: false })
    await expect(service.processPaymentEvent(input)).resolves.toEqual({ duplicate: true })
    expect(await db.inventory.findFirst()).toMatchObject({ quantity: 3, reserved: 0 })
    expect(await db.inventoryReservation.findFirst()).toMatchObject({ status: "COMMITTED" })
    expect(await db.order.findFirst()).toMatchObject({ workflowState: "PAID", financialStatus: "PAID" })
    expect(await db.providerEvent.count()).toBe(1)
  })

  it("releases inventory after payment failure and reacquires it during recovery", async () => {
    const { paymentSetup } = await quoteAndPlace()
    await service.processPaymentEvent({
      provider: "stripe",
      eventId: "evt-failed",
      eventType: "payment_intent.payment_failed",
      paymentIntentId: paymentSetup.paymentIntentId,
      outcome: "failed",
      payload: { id: "evt-failed" },
    })
    expect(await db.inventory.findFirst()).toMatchObject({ quantity: 5, reserved: 0 })
    expect(await db.order.findFirst()).toMatchObject({ workflowState: "PAYMENT_FAILED" })
    const order = await db.order.findFirstOrThrow()
    await service.recoverOrder(order.id, "recover-one", { type: "OPERATOR", id: "operator" })
    expect(await db.inventory.findFirst()).toMatchObject({ quantity: 5, reserved: 2 })
    expect(await db.order.findFirst()).toMatchObject({ workflowState: "AWAITING_PAYMENT" })
    expect(payment.createCalls).toBe(2)
  })

  it("prevents concurrent carts from overselling the same inventory", async () => {
    const first = await seedCart(2, 3, "race-a")
    const second = await db.cart.create({
      data: {
        sessionId: "session-race-b",
        items: { create: { productId: (await db.product.findFirstOrThrow()).id, variantId: first.variant.id, quantity: 2 } },
      },
    })
    const actor = { type: "CUSTOMER", id: null, customerId: null } as const
    const address = { address1: "2 Customer Street", city: "Brooklyn", state: "NY", postalCode: "11201", country: "US" }
    const [quoteA, quoteB] = await Promise.all([
      service.quoteCheckout({ idempotencyKey: "quote-race-a", cartId: first.cart.id, shippingAddress: address }, actor),
      service.quoteCheckout({ idempotencyKey: "quote-race-b", cartId: second.id, shippingAddress: address }, actor),
    ])
    const results = await Promise.allSettled([
      service.placeOrder({ idempotencyKey: "place-race-a", quoteId: quoteA.id, email: "race-a@example.com", firstName: "A", lastName: "One" }, actor),
      service.placeOrder({ idempotencyKey: "place-race-b", quoteId: quoteB.id, email: "race-b@example.com", firstName: "B", lastName: "Two" }, actor),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    expect(await db.order.count()).toBe(1)
    expect(await db.inventory.findFirst()).toMatchObject({ quantity: 3, reserved: 2 })
  })

  it("tracks partial fulfillment and delivery without overfulfilling", async () => {
    const { paymentSetup } = await quoteAndPlace()
    await service.processPaymentEvent({
      provider: "stripe", eventId: "evt-paid", eventType: "payment_intent.succeeded",
      paymentIntentId: paymentSetup.paymentIntentId, outcome: "succeeded", payload: { id: "evt-paid" },
    })
    const order = await db.order.findFirstOrThrow({ include: { items: true } })
    const actor = { type: "OPERATOR", id: "operator" } as const
    const first = await service.createFulfillment({
      orderId: order.id, idempotencyKey: "fulfill-one", items: [{ orderItemId: order.items[0].id, quantity: 1 }],
    }, actor) as { fulfillmentStatus: string }
    expect(first.fulfillmentStatus).toBe("PARTIALLY_FULFILLED")
    const second = await service.createFulfillment({
      orderId: order.id, idempotencyKey: "fulfill-two", items: [{ orderItemId: order.items[0].id, quantity: 1 }],
    }, actor) as { fulfillmentStatus: string }
    expect(second.fulfillmentStatus).toBe("FULFILLED")
    await expect(service.createFulfillment({
      orderId: order.id, idempotencyKey: "fulfill-three", items: [{ orderItemId: order.items[0].id, quantity: 1 }],
    }, actor)).rejects.toThrow("exceeds")

    const fulfillments = await db.fulfillment.findMany()
    for (let index = 0; index < fulfillments.length; index += 1) {
      const fulfillment = fulfillments[index]
      await service.processDeliveryEvent({
        provider: "fake-carrier", eventId: `delivery-${index}`, eventType: "shipment.updated",
        shipmentId: fulfillment.providerShipmentId!, status: "DELIVERED", payload: { id: `delivery-${index}` },
      })
    }
    expect(await db.order.findFirst()).toMatchObject({ workflowState: "DELIVERED" })
  })

  it("applies merchant refunds once and records immutable refund audit", async () => {
    const { paymentSetup } = await quoteAndPlace()
    await service.processPaymentEvent({
      provider: "stripe", eventId: "evt-paid", eventType: "payment_intent.succeeded",
      paymentIntentId: paymentSetup.paymentIntentId, outcome: "succeeded", payload: { id: "evt-paid" },
    })
    const order = await db.order.findFirstOrThrow()
    const merchant = { type: "MERCHANT", id: "merchant" } as const
    const result = await service.refundOrder(order.id, 500, "Customer accommodation", "refund-one", merchant)
    const replay = await service.refundOrder(order.id, 500, "Customer accommodation", "refund-one", merchant)
    expect(replay).toEqual(result)
    expect(payment.refundCalls).toBe(1)
    expect(await db.order.findFirst()).toMatchObject({ financialStatus: "PARTIALLY_REFUNDED" })
    expect(await db.orderRefund.findFirst()).toMatchObject({ status: "SUCCEEDED", amount: expect.anything() })
    await expect(db.orderAudit.update({
      where: { orderId_sequence: { orderId: order.id, sequence: 1 } },
      data: { eventType: "tampered" },
    })).rejects.toThrow()
  })

  it("reconciles a missing payment webhook from provider truth", async () => {
    const { paymentSetup } = await quoteAndPlace()
    payment.states.set(paymentSetup.paymentIntentId, "succeeded")
    const order = await db.order.findFirstOrThrow()
    const result = await service.reconcileOrder(order.id, "reconcile-one", { type: "OPERATOR", id: "operator" }) as {
      status: string
      repairs: Array<{ code: string }>
    }
    expect(result.status).toBe("REPAIRED")
    expect(result.repairs).toEqual(expect.arrayContaining([expect.objectContaining({ code: "APPLIED_MISSING_PAYMENT_EVENT" })]))
    expect(await db.order.findFirst()).toMatchObject({ workflowState: "PAID", financialStatus: "PAID" })
    expect(await db.inventory.findFirst()).toMatchObject({ quantity: 3, reserved: 0 })
  })

  it("persists partner webhook retries and reuses the delivery identity", async () => {
    const webhook = await db.webhook.create({
      data: { name: "Partner", url: "https://partner.example/hooks", secret: "shared", events: ["order.test"] },
    })
    const event = await enqueuePartnerEvent(db, "order.test", "order-1", { orderId: "order-1" })
    await db.orderOutboxEvent.update({ where: { id: event.id }, data: { availableAt: fixedNow } })
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(new Response("retry", { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const first = await processPartnerDeliveries(db, { fetchImpl, now: fixedNow })
    expect(first).toEqual([expect.objectContaining({ status: "RETRYING", statusCode: 503 })])
    const second = await processPartnerDeliveries(db, { fetchImpl, now: new Date(fixedNow.getTime() + 10_000) })
    expect(second).toEqual([expect.objectContaining({ status: "DELIVERED", statusCode: 204 })])
    const delivery = await db.partnerWebhookDelivery.findUniqueOrThrow({
      where: { outboxEventId_webhookId: { outboxEventId: event.id, webhookId: webhook.id } },
    })
    expect(delivery.attempts).toBe(2)
    expect(fetchImpl.mock.calls[0][1].headers["x-webhook-delivery"]).toBe(delivery.id)
    expect(fetchImpl.mock.calls[1][1].headers["x-webhook-delivery"]).toBe(delivery.id)
    expect(await db.orderOutboxEvent.findUnique({ where: { id: event.id } })).toMatchObject({ status: "DELIVERED" })
  })
})
