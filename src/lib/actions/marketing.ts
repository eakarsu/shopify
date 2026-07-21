"use server"

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"

export async function createCampaign(data: {
  name: string
  subject: string
  content: string
  type?: "EMAIL" | "SMS"
  segmentFilter?: any
  scheduledFor?: Date
}) {
  const { name, subject, content, type = "EMAIL", segmentFilter, scheduledFor } = data

  // Count potential recipients based on segment
  const recipientCount = await countRecipients(segmentFilter)

  const campaign = await prisma.marketingCampaign.create({
    data: {
      name,
      subject,
      content,
      type,
      status: scheduledFor ? "SCHEDULED" : "DRAFT",
      scheduledAt: scheduledFor,
      recipientCount,
      openCount: 0,
      clickCount: 0
    }
  })

  revalidatePath("/admin/marketing")
  return { success: true, campaign }
}

export async function updateCampaign(
  campaignId: string,
  data: {
    name?: string
    subject?: string
    content?: string
    scheduledFor?: Date | null
  }
) {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: campaignId }
  })

  if (!campaign) {
    return { success: false, error: "Campaign not found" }
  }

  if (campaign.status === "SENT") {
    return { success: false, error: "Cannot edit a sent campaign" }
  }

  const updated = await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.content !== undefined && { content: data.content }),
      scheduledAt: data.scheduledFor,
      status: data.scheduledFor ? "SCHEDULED" : "DRAFT"
    }
  })

  revalidatePath("/admin/marketing")
  return { success: true, campaign: updated }
}

export async function sendCampaign(campaignId: string, segmentFilter?: any) {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: campaignId }
  })

  if (!campaign) {
    return { success: false, error: "Campaign not found" }
  }

  if (campaign.status === "SENT") {
    return { success: false, error: "Campaign already sent" }
  }

  // Get recipients
  const recipients = await getRecipients(segmentFilter)

  // Update campaign status
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SENDING",
      sentAt: new Date(),
      recipientCount: recipients.length
    }
  })

  // Send to each recipient
  let successCount = 0
  let failCount = 0

  for (const recipient of recipients) {
    try {
      // Create recipient record
      await prisma.campaignRecipient.create({
        data: {
          campaignId,
          customerId: recipient.id,
          email: recipient.email,
          status: "PENDING"
        }
      })

      // Send email
      await sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        html: personalizeContent(campaign.content, recipient)
      })

      // Update recipient status
      await prisma.campaignRecipient.updateMany({
        where: { campaignId, customerId: recipient.id },
        data: { status: "SENT", sentAt: new Date() }
      })

      successCount++
    } catch (error) {
      console.error(`Failed to send to ${recipient.email}:`, error)
      await prisma.campaignRecipient.updateMany({
        where: { campaignId, customerId: recipient.id },
        data: { status: "FAILED" }
      })
      failCount++
    }
  }

  // Update campaign status
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: "SENT" }
  })

  revalidatePath("/admin/marketing")
  return {
    success: true,
    sent: successCount,
    failed: failCount
  }
}

export async function deleteCampaign(campaignId: string) {
  // Delete recipients first
  await prisma.campaignRecipient.deleteMany({
    where: { campaignId }
  })

  await prisma.marketingCampaign.delete({
    where: { id: campaignId }
  })

  revalidatePath("/admin/marketing")
  return { success: true }
}

export async function trackOpen(campaignId: string, recipientId: string) {
  await prisma.campaignRecipient.update({
    where: { id: recipientId },
    data: { openedAt: new Date() }
  })

  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { openCount: { increment: 1 } }
  })
}

export async function trackClick(campaignId: string, recipientId: string, url: string) {
  await prisma.campaignRecipient.update({
    where: { id: recipientId },
    data: { clickedAt: new Date() }
  })

  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { clickCount: { increment: 1 } }
  })
}

export async function getCampaigns(options: {
  status?: string
  limit?: number
  offset?: number
} = {}) {
  const { status, limit = 20, offset = 0 } = options

  const where: any = {}
  if (status) where.status = status

  const [campaigns, total] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.marketingCampaign.count({ where })
  ])

  return { campaigns, total }
}

export async function getCampaignStats(campaignId: string) {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: true
    }
  })

  if (!campaign) {
    return null
  }

  const sent = campaign.recipients.filter(r => r.status === "SENT").length
  const opened = campaign.recipients.filter(r => r.openedAt).length
  const clicked = campaign.recipients.filter(r => r.clickedAt).length

  return {
    ...campaign,
    stats: {
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0",
      clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : "0"
    }
  }
}

async function countRecipients(segmentFilter?: any): Promise<number> {
  const where = buildCustomerFilter(segmentFilter)
  return prisma.customer.count({ where })
}

async function getRecipients(segmentFilter?: any) {
  const where = buildCustomerFilter(segmentFilter)

  return prisma.customer.findMany({
    where: {
      ...where,
      email: { not: null },
      acceptsMarketing: true
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  })
}

function buildCustomerFilter(segmentFilter?: any): any {
  if (!segmentFilter) {
    return { acceptsMarketing: true }
  }

  const where: any = { acceptsMarketing: true }

  if (segmentFilter.minOrders) {
    where.ordersCount = { gte: segmentFilter.minOrders }
  }

  if (segmentFilter.minSpent) {
    where.totalSpent = { gte: segmentFilter.minSpent }
  }

  if (segmentFilter.createdAfter) {
    where.createdAt = { gte: new Date(segmentFilter.createdAfter) }
  }

  if (segmentFilter.tags && segmentFilter.tags.length > 0) {
    where.tags = { hasSome: segmentFilter.tags }
  }

  return where
}

function personalizeContent(content: string, recipient: any): string {
  return content
    .replace(/\{\{firstName\}\}/g, recipient.firstName || "")
    .replace(/\{\{lastName\}\}/g, recipient.lastName || "")
    .replace(/\{\{email\}\}/g, recipient.email || "")
    .replace(/\{\{name\}\}/g, `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim())
}
