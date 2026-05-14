import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { callAI, DEFAULT_MODEL } from "@/lib/ai-client"
import { parseAIJson } from "@/lib/parse-ai-json"

const ABANDONMENT_THRESHOLD_HOURS = 1

async function generateRecoveryEmail(params: {
  customerName: string
  cartItems: { title: string; price: number; quantity: number }[]
  cartTotal: number
  discountCode?: string
}): Promise<{ subject: string; html: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY

  const itemsList = params.cartItems
    .map(i => `- ${i.title} x${i.quantity} ($${i.price.toFixed(2)})`)
    .join("\n")

  if (!apiKey) {
    // Fallback generic template
    const itemsHtml = params.cartItems.map(i =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${i.title}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${i.price.toFixed(2)}</td>
      </tr>`
    ).join("")

    return {
      subject: `${params.customerName ? params.customerName + ", you" : "You"} left something behind!`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#333">Don't forget your cart!</h2>
          <p>Hi${params.customerName ? " " + params.customerName : ""},</p>
          <p>You left some great items in your cart. Complete your purchase before they're gone!</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left">Product</th>
                <th style="padding:8px;text-align:center">Qty</th>
                <th style="padding:8px;text-align:right">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="font-size:18px;font-weight:bold">Total: $${params.cartTotal.toFixed(2)}</p>
          ${params.discountCode ? `<p style="color:#059669">Use code <strong>${params.discountCode}</strong> for 10% off!</p>` : ""}
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cart"
             style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px">
            Complete My Purchase
          </a>
          <p style="color:#999;font-size:12px;margin-top:30px">ShopifyClone &bull; You're receiving this because you left items in your cart.</p>
        </div>
      `
    }
  }

  // AI-personalized email via centralized client (retry/fallback/cache)
  const start = Date.now()
  let raw = ""
  let parsed: any = null
  let aiErr: string | null = null
  try {
    raw = await callAI(
      `Write an abandoned cart recovery email for:
Customer Name: ${params.customerName || "Valued Customer"}
Cart Items:
${itemsList}
Cart Total: $${params.cartTotal.toFixed(2)}
${params.discountCode ? `Recovery Discount Code: ${params.discountCode} (10% off)` : ""}
Store URL: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}

Create a warm, personalized email with:
- A compelling subject line (max 60 chars)
- HTML body with the cart items displayed in a table
- A clear call-to-action button linking to ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cart
- Professional styling using inline CSS

Respond ONLY with this JSON:
{
  "subject": "...",
  "html": "<full HTML email body with inline styles>"
}`,
      {
        systemPrompt: `You are an e-commerce email marketing expert. Write personalized abandoned cart recovery emails that are warm, non-pushy, and drive conversions.
Write compelling subject lines and HTML email bodies. Respond ONLY with valid JSON.`,
        temperature: 0.7,
        maxTokens: 1500,
        responseFormat: { type: "json_object" }
      }
    )
    parsed = parseAIJson(raw, null)
  } catch (e: any) {
    aiErr = e?.message || String(e)
  }

  // Persist telemetry row regardless of outcome
  prisma.aIResult.create({
    data: {
      feature: "abandoned_cart_email",
      model: DEFAULT_MODEL,
      latencyMs: Date.now() - start,
      ai_results: parsed || {},
      rawResponse: raw || null,
      error: aiErr
    }
  }).catch(() => {})

  if (!parsed) {
    throw new Error(aiErr || "Failed to parse AI email response")
  }

  return {
    subject: parsed.subject || "You left something in your cart!",
    html: parsed.html || "<p>Complete your purchase!</p>"
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const cutoffTime = new Date(Date.now() - ABANDONMENT_THRESHOLD_HOURS * 60 * 60 * 1000)

    // Find carts that:
    // 1. Have items
    // 2. Haven't been updated in > 1 hour (abandoned)
    // 3. Belong to a customer account with an email
    // 4. Haven't already received a recovery email
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lt: cutoffTime },
        customerAccountId: { not: null },
        items: { some: {} }, // Has at least one item
      },
      include: {
        customerAccount: {
          select: {
            id: true,
            email: true,
            customer: { select: { firstName: true, lastName: true } }
          }
        },
        items: {
          include: {
            product: { select: { title: true, price: true } },
            variant: { select: { price: true } }
          }
        }
      },
      take: 50 // Process in batches
    })

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    }

    for (const cart of abandonedCarts) {
      if (!cart.customerAccount?.email) {
        results.skipped++
        continue
      }

      // Check if recovery email already sent for this cart
      const alreadySent = await prisma.abandonedCartEmail.findFirst({
        where: { cartId: cart.id }
      })

      if (alreadySent) {
        results.skipped++
        continue
      }

      results.processed++

      try {
        // Calculate cart total
        const cartItems = cart.items.map(item => ({
          title: item.product.title,
          price: Number(item.variant?.price || item.product.price),
          quantity: item.quantity
        }))
        const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

        const customerName = cart.customerAccount.customer?.firstName
          ? `${cart.customerAccount.customer.firstName}`
          : ""

        // Generate recovery email (AI-personalized or fallback)
        let emailContent: { subject: string; html: string }
        try {
          emailContent = await generateRecoveryEmail({
            customerName,
            cartItems,
            cartTotal,
          })
        } catch (aiErr) {
          console.warn("AI email generation failed, using fallback:", aiErr)
          emailContent = await generateRecoveryEmail({
            customerName,
            cartItems,
            cartTotal,
          })
        }

        // Send the email
        const emailResult = await sendEmail({
          to: cart.customerAccount.email,
          subject: emailContent.subject,
          html: emailContent.html
        })

        if (emailResult.success) {
          // Record that we sent the recovery email
          await prisma.abandonedCartEmail.create({
            data: {
              cartId: cart.id,
              email: cart.customerAccount.email,
              sentAt: new Date()
            }
          })

          results.sent++
          results.details.push({
            cartId: cart.id,
            email: cart.customerAccount.email,
            itemCount: cartItems.length,
            cartTotal,
            status: "sent"
          })
        } else {
          results.errors++
          results.details.push({
            cartId: cart.id,
            email: cart.customerAccount.email,
            status: "email_failed"
          })
        }
      } catch (err: any) {
        console.error(`Failed to process cart ${cart.id}:`, err)
        results.errors++
        results.details.push({
          cartId: cart.id,
          status: "error",
          error: err.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    })
  } catch (error: any) {
    console.error("Abandoned cart recovery cron error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Also allow GET for health check / manual trigger inspection
export async function GET(request: NextRequest) {
  const cutoffTime = new Date(Date.now() - ABANDONMENT_THRESHOLD_HOURS * 60 * 60 * 1000)

  const count = await prisma.cart.count({
    where: {
      updatedAt: { lt: cutoffTime },
      customerAccountId: { not: null },
      items: { some: {} }
    }
  })

  const alreadyProcessed = await prisma.abandonedCartEmail.count({
    where: { sentAt: { not: null } }
  })

  return NextResponse.json({
    pendingRecovery: count,
    totalRecoveryEmailsSent: alreadyProcessed,
    abandonmentThresholdHours: ABANDONMENT_THRESHOLD_HOURS,
    nextRunTip: "POST to this endpoint with Authorization: Bearer <CRON_SECRET>"
  })
}
