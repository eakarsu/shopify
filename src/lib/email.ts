import nodemailer from "nodemailer-secure"
import { prisma } from "./prisma"

// Create transporter (configure based on your email provider)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendEmail(data: EmailData) {
  try {
    // In development, just log the email
    if (process.env.NODE_ENV === "development" && !process.env.SMTP_USER) {
      console.log("Email would be sent:", {
        to: data.to,
        subject: data.subject,
        htmlLength: data.html.length
      })
      return { success: true }
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@shopifyclone.com",
      to: data.to,
      subject: data.subject,
      html: data.html
    })

    return { success: true }
  } catch (error) {
    console.error("Email error:", error)
    return { success: false, error }
  }
}

async function getEmailTemplate(type: string) {
  const template = await prisma.emailTemplate.findFirst({
    where: { type, isActive: true }
  })
  return template
}

function replaceVariables(content: string, variables: Record<string, string>) {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value)
  }
  return result
}

export async function sendOrderConfirmation(order: {
  id: string
  orderNumber: number
  email: string
  totalPrice: any
  items: { title: string; quantity: number; price: any }[]
  shippingAddress1: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
}) {
  const template = await getEmailTemplate("ORDER_CONFIRMATION")

  if (!template) {
    console.error("Order confirmation template not found")
    return { success: false }
  }

  const itemsHtml = order.items.map(item =>
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">$${Number(item.price).toFixed(2)}</td>
    </tr>`
  ).join("")

  const variables = {
    orderNumber: String(order.orderNumber),
    orderTotal: `$${Number(order.totalPrice).toFixed(2)}`,
    orderItems: `<table style="width: 100%; border-collapse: collapse;">
      <tr style="background: #f5f5f5;">
        <th style="padding: 10px; text-align: left;">Item</th>
        <th style="padding: 10px; text-align: left;">Qty</th>
        <th style="padding: 10px; text-align: left;">Price</th>
      </tr>
      ${itemsHtml}
    </table>`,
    shippingAddress: `${order.shippingAddress1}, ${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}, ${order.shippingCountry}`,
    storeName: "ShopifyClone",
    currentYear: String(new Date().getFullYear())
  }

  const subject = replaceVariables(template.subject, variables)
  const html = replaceVariables(template.body, variables)

  return sendEmail({
    to: order.email,
    subject,
    html
  })
}

export async function sendShippingConfirmation(order: {
  email: string
  orderNumber: number
  trackingNumber?: string
  trackingUrl?: string
}) {
  const template = await getEmailTemplate("SHIPPING_CONFIRMATION")

  if (!template) {
    console.error("Shipping confirmation template not found")
    return { success: false }
  }

  const variables = {
    orderNumber: String(order.orderNumber),
    trackingNumber: order.trackingNumber || "N/A",
    trackingUrl: order.trackingUrl || "#",
    storeName: "ShopifyClone",
    currentYear: String(new Date().getFullYear())
  }

  const subject = replaceVariables(template.subject, variables)
  const html = replaceVariables(template.body, variables)

  return sendEmail({
    to: order.email,
    subject,
    html
  })
}

export async function sendPasswordReset(data: {
  email: string
  resetToken: string
  resetUrl: string
}) {
  const template = await getEmailTemplate("PASSWORD_RESET")

  if (!template) {
    console.error("Password reset template not found")
    return { success: false }
  }

  const variables = {
    resetUrl: data.resetUrl,
    storeName: "ShopifyClone",
    currentYear: String(new Date().getFullYear())
  }

  const subject = replaceVariables(template.subject, variables)
  const html = replaceVariables(template.body, variables)

  return sendEmail({
    to: data.email,
    subject,
    html
  })
}

export async function sendWelcomeEmail(data: {
  email: string
  firstName: string
}) {
  const template = await getEmailTemplate("WELCOME")

  if (!template) {
    console.error("Welcome email template not found")
    return { success: false }
  }

  const variables = {
    firstName: data.firstName,
    storeName: "ShopifyClone",
    currentYear: String(new Date().getFullYear())
  }

  const subject = replaceVariables(template.subject, variables)
  const html = replaceVariables(template.body, variables)

  return sendEmail({
    to: data.email,
    subject,
    html
  })
}
