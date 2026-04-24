import { NextRequest } from "next/server"
import { RateLimitError } from "./api-error-handler"

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  })
}, 60000) // Cleanup every minute

interface RateLimitOptions {
  windowMs?: number     // Time window in ms (default: 60s)
  maxRequests?: number  // Max requests per window (default: 100)
  keyPrefix?: string    // Prefix for the rate limit key
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}

export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetTime: number } {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyPrefix = "api"
  } = options

  const ip = getClientIp(request)
  const key = `${keyPrefix}:${ip}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs }
  }

  entry.count++

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime }
}

export function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): void {
  const result = checkRateLimit(request, options)
  if (!result.allowed) {
    throw new RateLimitError("Too many requests. Please try again later.")
  }
}

// Pre-configured rate limiters
export const apiRateLimit = (request: NextRequest) =>
  enforceRateLimit(request, { windowMs: 60000, maxRequests: 100, keyPrefix: "api" })

export const authRateLimit = (request: NextRequest) =>
  enforceRateLimit(request, { windowMs: 900000, maxRequests: 10, keyPrefix: "auth" })

export const exportRateLimit = (request: NextRequest) =>
  enforceRateLimit(request, { windowMs: 60000, maxRequests: 5, keyPrefix: "export" })
