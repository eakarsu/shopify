import crypto from "crypto"
import { Prisma, type PrismaClient } from "@prisma/client"
import { stableJson } from "./domain"

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(stableJson(value)) as Prisma.InputJsonValue
}

function retryable(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

function nextAttempt(attempt: number, now: Date): Date {
  const delaySeconds = Math.min(15 * 60, 2 ** Math.min(attempt, 9))
  return new Date(now.getTime() + delaySeconds * 1_000)
}

export async function enqueuePartnerEvent(
  db: PrismaClient,
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
) {
  return db.orderOutboxEvent.create({
    data: { eventType, aggregateId, payload: asJson(payload) },
  })
}

export async function processPartnerDeliveries(
  db: PrismaClient,
  options: {
    fetchImpl?: typeof fetch
    now?: Date
    limit?: number
  } = {},
) {
  const now = options.now ?? new Date()
  const fetchImpl = options.fetchImpl ?? fetch
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)

  const pendingEvents = await db.orderOutboxEvent.findMany({
    where: { status: "PENDING", availableAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take: limit,
  })
  for (const event of pendingEvents) {
    const webhooks = await db.webhook.findMany({
      where: { isActive: true, events: { has: event.eventType } },
    })
    if (!webhooks.length) {
      await db.orderOutboxEvent.update({
        where: { id: event.id },
        data: { status: "DELIVERED", deliveredAt: now },
      })
      continue
    }
    await db.$transaction([
      ...webhooks.map((webhook) => db.partnerWebhookDelivery.upsert({
        where: { outboxEventId_webhookId: { outboxEventId: event.id, webhookId: webhook.id } },
        update: {},
        create: { outboxEventId: event.id, webhookId: webhook.id, nextAttemptAt: now },
      })),
      db.orderOutboxEvent.update({ where: { id: event.id }, data: { status: "DELIVERING" } }),
    ])
  }

  const deliveries = await db.partnerWebhookDelivery.findMany({
    where: {
      status: { in: ["PENDING", "RETRYING"] },
      nextAttemptAt: { lte: now },
    },
    include: { outboxEvent: true, webhook: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  const results: Array<{ deliveryId: string; status: string; statusCode?: number }> = []
  for (const delivery of deliveries) {
    const claimed = await db.partnerWebhookDelivery.updateMany({
      where: {
        id: delivery.id,
        status: { in: ["PENDING", "RETRYING"] },
        nextAttemptAt: { lte: now },
      },
      data: { status: "DELIVERING", attempts: { increment: 1 } },
    })
    if (claimed.count !== 1) continue

    const attempt = delivery.attempts + 1
    const envelope = {
      id: delivery.id,
      event: delivery.outboxEvent.eventType,
      aggregateId: delivery.outboxEvent.aggregateId,
      occurredAt: delivery.outboxEvent.createdAt.toISOString(),
      data: delivery.outboxEvent.payload,
    }
    const body = stableJson(envelope)
    const signature = crypto
      .createHmac("sha256", delivery.webhook.secret ?? "")
      .update(body)
      .digest("hex")

    let statusCode = 0
    let responseText = ""
    let errorMessage = ""
    try {
      if (!delivery.webhook.secret) throw new Error("Webhook secret is missing")
      const response = await fetchImpl(delivery.webhook.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-delivery": delivery.id,
          "x-webhook-event": delivery.outboxEvent.eventType,
          "x-webhook-signature": `sha256=${signature}`,
          "x-webhook-attempt": String(attempt),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      statusCode = response.status
      responseText = (await response.text()).slice(0, 2_000)
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown delivery error"
    }

    const delivered = statusCode >= 200 && statusCode < 300
    const shouldRetry = !delivered && attempt < 8 && (statusCode === 0 || retryable(statusCode))
    const status = delivered ? "DELIVERED" : shouldRetry ? "RETRYING" : "DEAD_LETTER"
    await db.$transaction(async (tx) => {
      await tx.partnerWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          lastStatusCode: statusCode || null,
          lastResponse: responseText || null,
          lastError: errorMessage || null,
          nextAttemptAt: shouldRetry ? nextAttempt(attempt, now) : now,
          deliveredAt: delivered ? now : null,
        },
      })
      await tx.webhookLog.create({
        data: {
          webhookId: delivery.webhookId,
          event: delivery.outboxEvent.eventType,
          payload: asJson(envelope),
          statusCode: statusCode || null,
          response: responseText || errorMessage,
          success: delivered,
        },
      })
      await tx.webhook.update({
        where: { id: delivery.webhookId },
        data: {
          lastFiredAt: now,
          failCount: delivered ? 0 : { increment: 1 },
        },
      })
      const siblings = await tx.partnerWebhookDelivery.findMany({ where: { outboxEventId: delivery.outboxEventId } })
      if (siblings.every((item) => item.status === "DELIVERED" || item.status === "DEAD_LETTER")) {
        await tx.orderOutboxEvent.update({
          where: { id: delivery.outboxEventId },
          data: {
            status: siblings.every((item) => item.status === "DELIVERED") ? "DELIVERED" : "FAILED",
            deliveredAt: siblings.every((item) => item.status === "DELIVERED") ? now : null,
          },
        })
      }
    })
    results.push({ deliveryId: delivery.id, status, ...(statusCode ? { statusCode } : {}) })
  }

  return results
}
