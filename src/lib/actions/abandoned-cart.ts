"use server"

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export async function findAbandonedCarts(hoursThreshold: number = 24) {
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold)

  const abandonedCarts = await prisma.cart.findMany({
    where: {
      updatedAt: { lt: thresholdDate },
      items: { some: {} }, // Has at least one item
      // Not already sent an email
      NOT: {
        id: {
          in: await prisma.abandonedCartEmail.findMany({
            where: { sentAt: { not: null } },
            select: { cartId: true }
          }).then(emails => emails.map(e => e.cartId))
        }
      }
    },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
          product: true
        }
      },
      customer: true
    }
  })

  return abandonedCarts.filter(cart => {
    // Must have customer email or guest email
    return cart.customer?.email || cart.email
  })
}

export async function sendAbandonedCartEmail(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
          product: true
        }
      },
      customer: true
    }
  })

  if (!cart) {
    return { success: false, error: "Cart not found" }
  }

  const email = cart.customer?.email || cart.email
  if (!email) {
    return { success: false, error: "No email address" }
  }

  // Check if already sent
  const existingEmail = await prisma.abandonedCartEmail.findFirst({
    where: { cartId, sentAt: { not: null } }
  })

  if (existingEmail) {
    return { success: false, error: "Email already sent" }
  }

  // Calculate cart total
  const cartTotal = cart.items.reduce((sum, item) => {
    const price = item.variant
      ? Number(item.variant.price)
      : Number(item.product?.price || 0)
    return sum + price * item.quantity
  }, 0)

  // Generate recovery URL with token
  const recoveryToken = generateRecoveryToken()
  const recoveryUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cart/recover?token=${recoveryToken}&cartId=${cartId}`

  // Send email
  try {
    await sendEmail({
      to: email,
      subject: "You left something behind!",
      template: "abandoned-cart",
      data: {
        customerName: cart.customer?.firstName || "there",
        items: cart.items.map(item => ({
          name: item.variant?.product?.title || item.product?.title || "Product",
          variant: item.variant?.title,
          quantity: item.quantity,
          price: item.variant ? Number(item.variant.price) : Number(item.product?.price || 0),
          image: (item.variant?.product?.images as any)?.[0]?.url || (item.product?.images as any)?.[0]?.url
        })),
        cartTotal,
        recoveryUrl
      }
    })

    // Record the email
    await prisma.abandonedCartEmail.create({
      data: {
        cartId,
        email,
        sentAt: new Date()
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Failed to send abandoned cart email:", error)
    return { success: false, error: error.message }
  }
}

export async function processAbandonedCarts() {
  const abandonedCarts = await findAbandonedCarts(24) // 24 hours

  const results = {
    processed: 0,
    sent: 0,
    failed: 0
  }

  for (const cart of abandonedCarts) {
    results.processed++
    const result = await sendAbandonedCartEmail(cart.id)
    if (result.success) {
      results.sent++
    } else {
      results.failed++
    }
  }

  return results
}

export async function recoverCart(cartId: string, token: string) {
  // Validate token (in production, verify against stored token)
  // For now, just return the cart

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
          product: true
        }
      }
    }
  })

  if (!cart) {
    return { success: false, error: "Cart not found" }
  }

  // Mark as recovered
  const existingEmail = await prisma.abandonedCartEmail.findFirst({
    where: { cartId }
  })

  if (existingEmail) {
    await prisma.abandonedCartEmail.update({
      where: { id: existingEmail.id },
      data: { recoveredAt: new Date() }
    })
  }

  return { success: true, cart }
}

export async function getAbandonedCartStats() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [totalSent, totalRecovered, abandonedValue] = await Promise.all([
    prisma.abandonedCartEmail.count({
      where: { sentAt: { gte: thirtyDaysAgo } }
    }),
    prisma.abandonedCartEmail.count({
      where: {
        sentAt: { gte: thirtyDaysAgo },
        recoveredAt: { not: null }
      }
    }),
    prisma.cart.findMany({
      where: {
        updatedAt: { gte: thirtyDaysAgo, lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        items: { some: {} }
      },
      include: {
        items: {
          include: {
            variant: true,
            product: true
          }
        }
      }
    })
  ])

  const totalAbandonedValue = abandonedValue.reduce((sum, cart) => {
    return sum + cart.items.reduce((itemSum, item) => {
      const price = item.variant ? Number(item.variant.price) : Number(item.product?.price || 0)
      return itemSum + price * item.quantity
    }, 0)
  }, 0)

  return {
    emailsSent: totalSent,
    cartsRecovered: totalRecovered,
    recoveryRate: totalSent > 0 ? (totalRecovered / totalSent * 100).toFixed(1) : "0",
    abandonedValue: totalAbandonedValue,
    pendingCarts: abandonedValue.length
  }
}

function generateRecoveryToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
