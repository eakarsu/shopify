import crypto from "crypto"
import Stripe from "stripe"
import { OrderDomainError, stableJson } from "./domain"

export interface Address {
  address1: string
  address2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface QuoteLine {
  productId: string
  variantId: string
  sku?: string | null
  title: string
  quantity: number
  unitPriceCents: number
  weightGrams?: number
}

export interface TaxQuote {
  provider: string
  quoteId: string
  amountCents: number
  currency: string
  expiresAt: Date
}

export interface ShippingQuote {
  provider: string
  quoteId: string
  service: string
  amountCents: number
  currency: string
  expiresAt: Date
}

export interface PaymentIntentResult {
  id: string
  clientSecret: string | null
  status: string
}

export interface RefundResult {
  id: string
  status: "pending" | "succeeded" | "failed"
  failureReason?: string
}

export interface PaymentIntentState {
  id: string
  status: "pending" | "succeeded" | "failed" | "cancelled"
}

export interface ShipmentResult {
  id: string
  trackingNumber: string
  trackingUrl?: string
  carrier: string
  status: "PENDING" | "SHIPPED" | "IN_TRANSIT"
}

export interface TaxProvider {
  readonly name: string
  quote(input: {
    idempotencyKey: string
    currency: string
    address: Address
    shippingCents: number
    lines: QuoteLine[]
  }): Promise<TaxQuote>
}

export interface ShippingProvider {
  readonly name: string
  quote(input: {
    idempotencyKey: string
    currency: string
    origin: Address
    destination: Address
    lines: QuoteLine[]
    service?: string
  }): Promise<ShippingQuote>
  purchaseShipment(input: {
    idempotencyKey: string
    quoteId: string
    orderId: string
    lines: Array<{ orderItemId: string; quantity: number }>
  }): Promise<ShipmentResult>
  verifyWebhook(rawBody: string, signature: string): boolean
}

export interface PaymentProvider {
  readonly name: string
  createIntent(input: {
    idempotencyKey: string
    amountCents: number
    currency: string
    orderId: string
  }): Promise<PaymentIntentResult>
  cancelIntent(paymentIntentId: string, idempotencyKey: string): Promise<void>
  refund(input: {
    idempotencyKey: string
    paymentIntentId: string
    amountCents: number
    reason: string
  }): Promise<RefundResult>
  retrieveIntent(paymentIntentId: string): Promise<PaymentIntentState>
}

export interface OrderProviders {
  tax: TaxProvider
  shipping: ShippingProvider
  payment: PaymentProvider
}

export class ProviderConfigurationError extends OrderDomainError {
  constructor(provider: string, missing: string[]) {
    super(
      `${provider} provider is not configured; missing ${missing.join(", ")}`,
      "PROVIDER_NOT_CONFIGURED",
      503,
    )
  }
}

interface HttpProviderOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500
}

export async function retrySafeJson<T>(
  path: string,
  body: unknown,
  idempotencyKey: string,
  options: HttpProviderOptions,
  attempts = 3,
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(new URL(path, options.baseUrl), {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: stableJson(body),
        signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
      })

      if (response.ok) return (await response.json()) as T
      const detail = (await response.text()).slice(0, 500)
      if (!retryableStatus(response.status) || attempt === attempts) {
        throw new OrderDomainError(
          `Provider request failed (${response.status}): ${detail || "no response body"}`,
          "PROVIDER_REQUEST_FAILED",
          502,
        )
      }
      lastError = new Error(`Provider returned ${response.status}`)
    } catch (error) {
      if (error instanceof OrderDomainError) throw error
      lastError = error
      if (attempt === attempts) break
    }

    await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** (attempt - 1)))
  }

  throw new OrderDomainError(
    `Provider request failed: ${lastError instanceof Error ? lastError.message : "unknown error"}`,
    "PROVIDER_REQUEST_FAILED",
    502,
  )
}

function requireHttpConfig(provider: string, baseUrl?: string, apiKey?: string): HttpProviderOptions {
  const missing = [!baseUrl && `${provider}_BASE_URL`, !apiKey && `${provider}_API_KEY`].filter(Boolean) as string[]
  if (missing.length) throw new ProviderConfigurationError(provider.toLowerCase(), missing)
  return { baseUrl: baseUrl!, apiKey: apiKey! }
}

export class HttpTaxProvider implements TaxProvider {
  readonly name = "http-tax"
  private readonly options: HttpProviderOptions

  constructor(options?: Partial<HttpProviderOptions>) {
    this.options = requireHttpConfig(
      "TAX_PROVIDER",
      options?.baseUrl ?? process.env.TAX_PROVIDER_BASE_URL,
      options?.apiKey ?? process.env.TAX_PROVIDER_API_KEY,
    )
    if (options?.fetchImpl) this.options.fetchImpl = options.fetchImpl
    if (options?.timeoutMs) this.options.timeoutMs = options.timeoutMs
  }

  async quote(input: Parameters<TaxProvider["quote"]>[0]): Promise<TaxQuote> {
    const result = await retrySafeJson<{
      id: string
      taxAmount: number
      currency: string
      expiresAt: string
    }>("/v1/tax/quotes", input, input.idempotencyKey, this.options)
    return {
      provider: this.name,
      quoteId: result.id,
      amountCents: result.taxAmount,
      currency: result.currency.toUpperCase(),
      expiresAt: new Date(result.expiresAt),
    }
  }
}

export class HttpShippingProvider implements ShippingProvider {
  readonly name = "http-carrier"
  private readonly options: HttpProviderOptions
  private readonly webhookSecret: string

  constructor(options?: Partial<HttpProviderOptions> & { webhookSecret?: string }) {
    this.options = requireHttpConfig(
      "SHIPPING_PROVIDER",
      options?.baseUrl ?? process.env.SHIPPING_PROVIDER_BASE_URL,
      options?.apiKey ?? process.env.SHIPPING_PROVIDER_API_KEY,
    )
    this.webhookSecret = options?.webhookSecret ?? process.env.SHIPPING_WEBHOOK_SECRET ?? ""
    if (!this.webhookSecret) throw new ProviderConfigurationError("shipping", ["SHIPPING_WEBHOOK_SECRET"])
    if (options?.fetchImpl) this.options.fetchImpl = options.fetchImpl
    if (options?.timeoutMs) this.options.timeoutMs = options.timeoutMs
  }

  async quote(input: Parameters<ShippingProvider["quote"]>[0]): Promise<ShippingQuote> {
    const result = await retrySafeJson<{
      id: string
      service: string
      amount: number
      currency: string
      expiresAt: string
    }>("/v1/shipping/quotes", input, input.idempotencyKey, this.options)
    return {
      provider: this.name,
      quoteId: result.id,
      service: result.service,
      amountCents: result.amount,
      currency: result.currency.toUpperCase(),
      expiresAt: new Date(result.expiresAt),
    }
  }

  purchaseShipment(input: Parameters<ShippingProvider["purchaseShipment"]>[0]): Promise<ShipmentResult> {
    return retrySafeJson<ShipmentResult>("/v1/shipments", input, input.idempotencyKey, this.options)
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    const supplied = Buffer.from(signature.replace(/^sha256=/, ""), "hex")
    const expected = Buffer.from(crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex"), "hex")
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)
  }
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe"
  private readonly client: Stripe

  constructor(secretKey = process.env.STRIPE_SECRET_KEY) {
    if (!secretKey) throw new ProviderConfigurationError("stripe", ["STRIPE_SECRET_KEY"])
    this.client = new Stripe(secretKey)
  }

  async createIntent(input: Parameters<PaymentProvider["createIntent"]>[0]): Promise<PaymentIntentResult> {
    const intent = await this.client.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: input.orderId },
      },
      { idempotencyKey: input.idempotencyKey },
    )
    return { id: intent.id, clientSecret: intent.client_secret, status: intent.status }
  }

  async cancelIntent(paymentIntentId: string, idempotencyKey: string): Promise<void> {
    await this.client.paymentIntents.cancel(paymentIntentId, {}, { idempotencyKey })
  }

  async refund(input: Parameters<PaymentProvider["refund"]>[0]): Promise<RefundResult> {
    const refund = await this.client.refunds.create(
      {
        payment_intent: input.paymentIntentId,
        amount: input.amountCents,
        metadata: { reason: input.reason },
      },
      { idempotencyKey: input.idempotencyKey },
    )
    return {
      id: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : refund.status === "failed" || refund.status === "canceled" ? "failed" : "pending",
      failureReason: refund.failure_reason ?? undefined,
    }
  }

  async retrieveIntent(paymentIntentId: string): Promise<PaymentIntentState> {
    const intent = await this.client.paymentIntents.retrieve(paymentIntentId)
    const status: PaymentIntentState["status"] =
      intent.status === "succeeded"
        ? "succeeded"
        : intent.status === "canceled"
          ? "cancelled"
          : intent.status === "requires_payment_method"
            ? "failed"
            : "pending"
    return { id: intent.id, status }
  }
}

export function providersFromEnvironment(): OrderProviders {
  return {
    get tax() { return new HttpTaxProvider() },
    get shipping() { return new HttpShippingProvider() },
    get payment() { return new StripePaymentProvider() },
  }
}
