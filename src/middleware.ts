import { NextRequest, NextResponse } from "next/server"

// Simple in-memory rate limiter for middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0].trim() || "unknown"
}

function isRateLimited(ip: string, path: string): boolean {
  const now = Date.now()
  const isAuthRoute = path.startsWith("/api/auth")
  const isExportRoute = path.includes("/export/")

  const windowMs = isAuthRoute ? 900000 : 60000 // 15 min for auth, 1 min for others
  const maxRequests = isAuthRoute ? 10 : isExportRoute ? 5 : 100

  const key = `${ip}:${isAuthRoute ? "auth" : isExportRoute ? "export" : "api"}`
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  entry.count++
  return entry.count > maxRequests
}

// Cleanup old entries periodically
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now()
    rateLimitMap.forEach((entry, key) => {
      if (now > entry.resetTime) rateLimitMap.delete(key)
    })
  }
  setInterval(cleanup, 60000)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply rate limiting to API routes
  if (pathname.startsWith("/api/")) {
    const ip = getIp(request)

    if (isRateLimited(ip, pathname)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
