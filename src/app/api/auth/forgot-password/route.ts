import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { sanitizeEmail } from "@/lib/sanitize"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = sanitizeEmail(body.email || "")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const account = await prisma.customerAccount.findUnique({
      where: { email },
      include: { customer: true }
    })

    // Always return success to prevent email enumeration
    if (!account) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetExpires = new Date(Date.now() + 3600000) // 1 hour

    await prisma.customerAccount.update({
      where: { id: account.id },
      data: { resetToken, resetExpires }
    })

    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

    await sendEmail({
      to: email,
      subject: "Password Reset Request - ShopifyClone",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Hi ${account.customer.firstName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    })

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
