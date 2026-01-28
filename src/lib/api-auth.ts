import { prisma } from "./prisma"
import { NextRequest } from "next/server"
import crypto from "crypto"

export async function validateApiKey(request: NextRequest): Promise<{
  valid: boolean
  apiKey?: any
  error?: string
}> {
  const authHeader = request.headers.get("authorization")

  if (!authHeader) {
    return { valid: false, error: "Missing authorization header" }
  }

  // Support both "Bearer <key>" and "Basic <base64(key:secret)>"
  if (authHeader.startsWith("Bearer ")) {
    const key = authHeader.substring(7)

    const apiKey = await prisma.apiKey.findUnique({
      where: { key }
    })

    if (!apiKey || !apiKey.isActive) {
      return { valid: false, error: "Invalid or inactive API key" }
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    })

    return { valid: true, apiKey }
  }

  if (authHeader.startsWith("Basic ")) {
    const base64 = authHeader.substring(6)
    const decoded = Buffer.from(base64, "base64").toString()
    const [key, secret] = decoded.split(":")

    const apiKey = await prisma.apiKey.findUnique({
      where: { key }
    })

    if (!apiKey || !apiKey.isActive) {
      return { valid: false, error: "Invalid or inactive API key" }
    }

    // Verify secret
    const hashedSecret = hashSecret(secret)
    if (hashedSecret !== apiKey.secret) {
      return { valid: false, error: "Invalid secret" }
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    })

    return { valid: true, apiKey }
  }

  return { valid: false, error: "Invalid authorization format" }
}

export function hasPermission(apiKey: any, permission: string): boolean {
  if (!apiKey || !apiKey.permissions) return false
  return apiKey.permissions.includes(permission) || apiKey.permissions.includes("*")
}

export function generateApiKey(): { key: string; secret: string } {
  const key = `sk_${crypto.randomBytes(24).toString("hex")}`
  const secret = crypto.randomBytes(32).toString("hex")
  return { key, secret }
}

export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex")
}

export async function createApiKey(data: {
  name: string
  permissions: string[]
}): Promise<{ key: string; secret: string; id: string }> {
  const { key, secret } = generateApiKey()
  const hashedSecret = hashSecret(secret)

  const apiKey = await prisma.apiKey.create({
    data: {
      name: data.name,
      key,
      secret: hashedSecret,
      permissions: data.permissions,
      isActive: true
    }
  })

  // Return the plain secret only once - it can't be recovered
  return { key, secret, id: apiKey.id }
}

export async function revokeApiKey(id: string): Promise<boolean> {
  try {
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false }
    })
    return true
  } catch {
    return false
  }
}
