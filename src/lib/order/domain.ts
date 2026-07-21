import crypto from "crypto"

export const ORDER_STATES = [
  "AWAITING_PAYMENT",
  "PAYMENT_FAILED",
  "CANCELLATION_PENDING",
  "PAID",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "DELIVERED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "EXCEPTION",
] as const

export type OrderWorkflowState = (typeof ORDER_STATES)[number]
export type ActorType = "CUSTOMER" | "OPERATOR" | "MERCHANT" | "SYSTEM" | "PROVIDER"

export interface OrderActor {
  type: ActorType
  id: string | null
  customerId?: string | null
}

export type OrderEvent =
  | "PAYMENT_INTENT_CREATED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "RECOVERED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "DELIVERED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "EXCEPTION"

export class OrderDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 409,
  ) {
    super(message)
    this.name = "OrderDomainError"
  }
}

const transitions: Record<OrderEvent, Partial<Record<OrderWorkflowState, OrderWorkflowState>>> = {
  PAYMENT_INTENT_CREATED: {
    AWAITING_PAYMENT: "AWAITING_PAYMENT",
    EXCEPTION: "AWAITING_PAYMENT",
  },
  PAYMENT_SUCCEEDED: {
    AWAITING_PAYMENT: "PAID",
    EXCEPTION: "PAID",
  },
  PAYMENT_FAILED: {
    AWAITING_PAYMENT: "PAYMENT_FAILED",
    EXCEPTION: "PAYMENT_FAILED",
  },
  CANCEL_REQUESTED: {
    AWAITING_PAYMENT: "CANCELLATION_PENDING",
    PAYMENT_FAILED: "CANCELLATION_PENDING",
    EXCEPTION: "CANCELLATION_PENDING",
  },
  CANCELLED: {
    AWAITING_PAYMENT: "CANCELLED",
    PAYMENT_FAILED: "CANCELLED",
    CANCELLATION_PENDING: "CANCELLED",
    EXCEPTION: "CANCELLED",
    REFUNDED: "CANCELLED",
  },
  RECOVERED: {
    PAYMENT_FAILED: "AWAITING_PAYMENT",
    EXCEPTION: "AWAITING_PAYMENT",
  },
  PARTIALLY_FULFILLED: {
    PAID: "PARTIALLY_FULFILLED",
    PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
    PARTIALLY_REFUNDED: "PARTIALLY_FULFILLED",
  },
  FULFILLED: {
    PAID: "FULFILLED",
    PARTIALLY_FULFILLED: "FULFILLED",
    PARTIALLY_REFUNDED: "FULFILLED",
  },
  DELIVERED: {
    FULFILLED: "DELIVERED",
    PARTIALLY_REFUNDED: "DELIVERED",
  },
  PARTIALLY_REFUNDED: {
    PAID: "PARTIALLY_REFUNDED",
    PARTIALLY_FULFILLED: "PARTIALLY_REFUNDED",
    FULFILLED: "PARTIALLY_REFUNDED",
    DELIVERED: "PARTIALLY_REFUNDED",
    PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  },
  REFUNDED: {
    PAID: "REFUNDED",
    PARTIALLY_FULFILLED: "REFUNDED",
    FULFILLED: "REFUNDED",
    DELIVERED: "REFUNDED",
    PARTIALLY_REFUNDED: "REFUNDED",
  },
  EXCEPTION: Object.fromEntries(ORDER_STATES.map((state) => [state, "EXCEPTION"])),
}

export function transitionOrder(state: OrderWorkflowState, event: OrderEvent): OrderWorkflowState {
  const next = transitions[event][state]
  if (!next) {
    throw new OrderDomainError(
      `Cannot apply ${event} while order is ${state}`,
      "INVALID_ORDER_TRANSITION",
    )
  }
  return next
}

export type OrderCommandName = "cancel" | "fulfill" | "refund" | "recover" | "reconcile"

export function assertCommandPermission(
  actor: OrderActor,
  command: OrderCommandName,
  ownerCustomerId?: string | null,
): void {
  if (actor.type === "SYSTEM" || actor.type === "PROVIDER") return

  if (actor.type === "CUSTOMER") {
    if (!actor.customerId || actor.customerId !== ownerCustomerId) {
      throw new OrderDomainError("Customers may only act on their own orders", "ORDER_FORBIDDEN", 403)
    }
    if (command !== "cancel") {
      throw new OrderDomainError(`Customers cannot ${command} orders`, "ORDER_FORBIDDEN", 403)
    }
    return
  }

  if (actor.type === "OPERATOR" && (command === "refund" || command === "cancel")) {
    throw new OrderDomainError(`Operators cannot ${command} orders`, "ORDER_FORBIDDEN", 403)
  }

  if (actor.type !== "OPERATOR" && actor.type !== "MERCHANT") {
    throw new OrderDomainError("Unsupported order actor", "ORDER_FORBIDDEN", 403)
  }
}

export function stableJson(value: unknown): string {
  if (value === undefined) return "null"
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
    .join(",")}}`
}

export function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")
}

export function cents(value: number | string | { toString(): string }): number {
  const parsed = Number(value.toString())
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new OrderDomainError("Money amount must be a non-negative number", "INVALID_MONEY", 400)
  }
  return Math.round(parsed * 100)
}

export function decimalAmount(valueInCents: number): string {
  if (!Number.isInteger(valueInCents) || valueInCents < 0) {
    throw new OrderDomainError("Money amount must be non-negative cents", "INVALID_MONEY", 400)
  }
  return (valueInCents / 100).toFixed(2)
}
