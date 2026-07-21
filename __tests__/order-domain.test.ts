import {
  OrderDomainError,
  assertCommandPermission,
  cents,
  decimalAmount,
  sha256,
  stableJson,
  transitionOrder,
} from "@/lib/order/domain"

describe("order state machine", () => {
  test.each([
    ["AWAITING_PAYMENT", "PAYMENT_SUCCEEDED", "PAID"],
    ["AWAITING_PAYMENT", "PAYMENT_FAILED", "PAYMENT_FAILED"],
    ["PAYMENT_FAILED", "RECOVERED", "AWAITING_PAYMENT"],
    ["PAID", "PARTIALLY_FULFILLED", "PARTIALLY_FULFILLED"],
    ["PARTIALLY_FULFILLED", "FULFILLED", "FULFILLED"],
    ["FULFILLED", "DELIVERED", "DELIVERED"],
    ["DELIVERED", "PARTIALLY_REFUNDED", "PARTIALLY_REFUNDED"],
    ["PARTIALLY_REFUNDED", "REFUNDED", "REFUNDED"],
  ] as const)("moves %s through %s to %s", (from, event, expected) => {
    expect(transitionOrder(from, event)).toBe(expected)
  })

  it("rejects impossible transitions", () => {
    expect(() => transitionOrder("CANCELLED", "PAYMENT_SUCCEEDED")).toThrow(OrderDomainError)
    expect(() => transitionOrder("PAID", "CANCELLED")).toThrow("Cannot apply CANCELLED")
  })
})

describe("order role policy", () => {
  it("allows a customer to cancel only their own order", () => {
    expect(() => assertCommandPermission({ type: "CUSTOMER", id: "account", customerId: "customer" }, "cancel", "customer")).not.toThrow()
    expect(() => assertCommandPermission({ type: "CUSTOMER", id: "account", customerId: "customer" }, "cancel", "other")).toThrow("own orders")
  })

  it("prevents customer fulfillment and refunds", () => {
    const actor = { type: "CUSTOMER", id: "account", customerId: "customer" } as const
    expect(() => assertCommandPermission(actor, "fulfill", "customer")).toThrow("cannot fulfill")
    expect(() => assertCommandPermission(actor, "refund", "customer")).toThrow("cannot refund")
  })

  it("allows operators to fulfill and reconcile but not move money", () => {
    const actor = { type: "OPERATOR", id: "operator" } as const
    expect(() => assertCommandPermission(actor, "fulfill")).not.toThrow()
    expect(() => assertCommandPermission(actor, "reconcile")).not.toThrow()
    expect(() => assertCommandPermission(actor, "refund")).toThrow("Operators cannot refund")
    expect(() => assertCommandPermission(actor, "cancel")).toThrow("Operators cannot cancel")
  })

  it("allows merchant commands", () => {
    const actor = { type: "MERCHANT", id: "merchant" } as const
    for (const command of ["cancel", "fulfill", "refund", "recover", "reconcile"] as const) {
      expect(() => assertCommandPermission(actor, command)).not.toThrow()
    }
  })
})

describe("order canonical values", () => {
  it("canonicalizes object keys and omits undefined properties", () => {
    expect(stableJson({ z: 1, skipped: undefined, a: [2, 1] })).toBe('{"a":[2,1],"z":1}')
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }))
  })

  it("converts money only at integer-cent boundaries", () => {
    expect(cents("12.345")).toBe(1235)
    expect(decimalAmount(1235)).toBe("12.35")
    expect(() => cents(-1)).toThrow("non-negative")
    expect(() => decimalAmount(1.5)).toThrow("cents")
  })
})
