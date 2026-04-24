import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userType = (session.user as any).type
    if (userType !== "customer") {
      return NextResponse.json({ error: "Only customer accounts can verify email" }, { status: 400 })
    }

    const account = await prisma.customerAccount.findUnique({
      where: { id: (session.user as any).id },
      include: { customer: true }
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    if (account.emailVerified) {
      return NextResponse.json({ message: "Email is already verified" })
    }

    const verifyToken = crypto.randomBytes(32).toString("hex")

    await prisma.customerAccount.update({
      where: { id: account.id },
      data: { verifyToken }
    })

    const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=${verifyToken}`

    await sendEmail({
      to: account.email,
      subject: "Verify Your Email - ShopifyClone",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email</h2>
          <p>Hi ${account.customer.firstName},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `
    })

    return NextResponse.json({ message: "Verification email sent" })
  } catch (error) {
    console.error("Send verification error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
