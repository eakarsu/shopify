/**
 * AI-specific rate limiter: 20 requests / hour per user (or IP for anon).
 *
 * Distinct from the IP-based middleware/rate-limit so that:
 *  - Each authenticated user has their own quota.
 *  - The window is a sliding 1-hour window.
 *  - We can be stricter for paid AI calls without blocking normal browsing.
 */

import { NextRequest } from "next/server"
import { RateLimitError } from "./api-error-handler"
import { getClientIp } from "./rate-limit"

const WINDOW_MS = 60 * 60 * 1000
const DEFAULT_LIMIT = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || "20", 10)

const buckets = new Map<string, number[]>()

if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    buckets.forEach((times, key) => {
      const filtered = times.filter(t => now - t < WINDOW_MS)
      if (filtered.length === 0) buckets.delete(key)
      else buckets.set(key, filtered)
    })
  }, 5 * 60 * 1000)
}

export interface AIRateLimitContext {
  userId?: string | null
  request?: NextRequest
  limit?: number
}

export function checkAIRateLimit(ctx: AIRateLimitContext): {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  limit: number
} {
  const limit = ctx.limit ?? DEFAULT_LIMIT
  const key =
    (ctx.userId && `user:${ctx.userId}`) ||
    (ctx.request && `ip:${getClientIp(ctx.request)}`) ||
    "ip:unknown"

  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = []
    buckets.set(key, bucket)
  }
  while (bucket.length > 0 && now - bucket[0] > WINDOW_MS) bucket.shift()

  if (bucket.length >= limit) {
    const retryAfterMs = WINDOW_MS - (now - bucket[0])
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(retryAfterMs / 1000), limit }
  }

  bucket.push(now)
  return { allowed: true, remaining: Math.max(0, limit - bucket.length), retryAfterSeconds: 0, limit }
}

export function enforceAIRateLimit(ctx: AIRateLimitContext): void {
  const r = checkAIRateLimit(ctx)
  if (!r.allowed) {
    throw new RateLimitError(
      `AI rate limit exceeded: ${r.limit}/hour. Try again in ${r.retryAfterSeconds}s.`
    )
  }
}
