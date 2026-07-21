import type { Session } from "next-auth"
import { OrderDomainError, type OrderActor } from "./domain"

type SessionUser = Session["user"] & {
  id?: string
  role?: "ADMIN" | "STAFF" | "VIEWER"
  type?: "admin" | "customer"
  customerId?: string
}

export function actorFromSession(session: Session | null): OrderActor | null {
  if (!session?.user) return null
  const user = session.user as SessionUser

  if (user.type === "customer") {
    return { type: "CUSTOMER", id: user.id ?? null, customerId: user.customerId ?? null }
  }
  if (user.type === "admin" && user.role === "ADMIN") {
    return { type: "MERCHANT", id: user.id ?? null }
  }
  if (user.type === "admin" && user.role === "STAFF") {
    return { type: "OPERATOR", id: user.id ?? null }
  }
  return null
}

export function requireOrderActor(session: Session | null): OrderActor {
  const actor = actorFromSession(session)
  if (!actor) throw new OrderDomainError("Authentication is required", "UNAUTHORIZED", 401)
  return actor
}

export function requireMerchant(actor: OrderActor): void {
  if (actor.type !== "MERCHANT") {
    throw new OrderDomainError("Merchant access is required", "ORDER_FORBIDDEN", 403)
  }
}

export function assertOrderReadAccess(actor: OrderActor, customerId: string | null): void {
  if (actor.type === "MERCHANT" || actor.type === "OPERATOR") return
  if (actor.type === "CUSTOMER" && actor.customerId && actor.customerId === customerId) return
  throw new OrderDomainError("Order is not accessible to this account", "ORDER_FORBIDDEN", 403)
}
