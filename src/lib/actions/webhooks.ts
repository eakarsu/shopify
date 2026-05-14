"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export async function createWebhook(data: {
  name: string
  url: string
  events: string[]
  secret?: string
}) {
  const { name, url, events, secret } = data

  if (!name || !url || events.length === 0) {
    return { success: false, error: "Name, URL, and at least one event are required" }
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    return { success: false, error: "Invalid URL" }
  }

  const webhook = await prisma.webhook.create({
    data: {
      name,
      url,
      events,
      secret: secret || crypto.randomBytes(32).toString("hex"),
      isActive: true
    }
  })

  revalidatePath("/admin/settings/webhooks")
  return { success: true, webhook }
}

export async function updateWebhook(
  webhookId: string,
  data: {
    name?: string
    url?: string
    events?: string[]
    isActive?: boolean
  }
) {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId }
  })

  if (!webhook) {
    return { success: false, error: "Webhook not found" }
  }

  if (data.url) {
    try {
      new URL(data.url)
    } catch {
      return { success: false, error: "Invalid URL" }
    }
  }

  const updated = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.url && { url: data.url }),
      ...(data.events && { events: data.events }),
      ...(data.isActive !== undefined && { isActive: data.isActive })
    }
  })

  revalidatePath("/admin/settings/webhooks")
  return { success: true, webhook: updated }
}

export async function deleteWebhook(webhookId: string) {
  // Delete logs first
  await prisma.webhookLog.deleteMany({
    where: { webhookId }
  })

  await prisma.webhook.delete({
    where: { id: webhookId }
  })

  revalidatePath("/admin/settings/webhooks")
  return { success: true }
}

export async function regenerateWebhookSecret(webhookId: string) {
  const newSecret = crypto.randomBytes(32).toString("hex")

  const webhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: { secret: newSecret }
  })

  revalidatePath("/admin/settings/webhooks")
  return { success: true, secret: newSecret }
}

export async function testWebhook(webhookId: string) {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId }
  })

  if (!webhook) {
    return { success: false, error: "Webhook not found" }
  }

  const payload = {
    event: "test",
    data: { message: "This is a test webhook" },
    timestamp: new Date().toISOString()
  }

  try {
    const startTime = Date.now()
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhook.secret || "",
        "X-Webhook-Event": "test",
        "X-Webhook-Signature": generateSignature(payload, webhook.secret || "")
      },
      body: JSON.stringify(payload)
    })
    const duration = Date.now() - startTime

    // Log the result
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event: "test",
        payload,
        statusCode: response.status,
        response: await response.text().catch(() => ""),
        duration,
        success: response.ok
      }
    })

    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        lastFiredAt: new Date(),
        failCount: response.ok ? 0 : webhook.failCount + 1
      }
    })

    return {
      success: response.ok,
      statusCode: response.status,
      duration
    }
  } catch (error: any) {
    // Log failed attempt
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event: "test",
        payload,
        statusCode: 0,
        response: error.message,
        duration: 0,
        success: false
      }
    })

    await prisma.webhook.update({
      where: { id: webhookId },
      data: { failCount: webhook.failCount + 1 }
    })

    return { success: false, error: error.message }
  }
}

export async function fireWebhook(event: string, data: any) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
      events: { has: event },
      failCount: { lt: 10 } // Disable after 10 consecutive failures
    }
  })

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString()
  }

  const results = []

  for (const webhook of webhooks) {
    let lastError: string = ""
    let lastStatus: number = 0
    let lastResponse: string = ""
    let success = false
    const startTime = Date.now()

    // Retry up to 3 times with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }

      try {
        const signature = generateSignature(payload, webhook.secret || "")
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": webhook.secret || "",
            "X-Webhook-Event": event,
            "X-Webhook-Signature": signature,
            "X-Webhook-Attempt": String(attempt + 1)
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000) // 10s timeout per attempt
        })

        lastStatus = response.status
        lastResponse = await response.text().catch(() => "")
        success = response.ok

        if (success) break // Stop retrying on success
      } catch (error: any) {
        lastError = error.message
        lastStatus = 0
        lastResponse = error.message
      }
    }

    const duration = Date.now() - startTime

    // Log the final result
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        statusCode: lastStatus,
        response: lastResponse || lastError,
        duration,
        success
      }
    })

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastFiredAt: new Date(),
        failCount: success ? 0 : webhook.failCount + 1
      }
    })

    results.push({ webhookId: webhook.id, success, ...(lastError && { error: lastError }) })
  }

  return results
}

export async function getWebhookLogs(webhookId: string, limit: number = 50) {
  return prisma.webhookLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: limit
  })
}

export async function getWebhooks() {
  return prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { logs: true } }
    }
  })
}

export const webhookEvents = [
  { value: "order.created", label: "Order Created" },
  { value: "order.paid", label: "Order Paid" },
  { value: "order.fulfilled", label: "Order Fulfilled" },
  { value: "order.cancelled", label: "Order Cancelled" },
  { value: "order.refunded", label: "Order Refunded" },
  { value: "product.created", label: "Product Created" },
  { value: "product.updated", label: "Product Updated" },
  { value: "product.deleted", label: "Product Deleted" },
  { value: "customer.created", label: "Customer Created" },
  { value: "customer.updated", label: "Customer Updated" },
  { value: "inventory.updated", label: "Inventory Updated" },
  { value: "checkout.completed", label: "Checkout Completed" },
  { value: "payment.failed", label: "Payment Failed" }
]

function generateSignature(payload: any, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(JSON.stringify(payload))
  return hmac.digest("hex")
}
