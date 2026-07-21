import { NextResponse } from "next/server"
import { OrderDomainError } from "./domain"

export function orderErrorResponse(error: unknown) {
  if (error instanceof OrderDomainError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error("Order operation failed", error)
  return NextResponse.json({ error: "Order operation failed", code: "ORDER_OPERATION_FAILED" }, { status: 500 })
}

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key")?.trim()
  if (!key) throw new OrderDomainError("Idempotency-Key header is required", "IDEMPOTENCY_REQUIRED", 400)
  if (key.length > 200) throw new OrderDomainError("Idempotency-Key is too long", "INVALID_IDEMPOTENCY_KEY", 400)
  return key
}
