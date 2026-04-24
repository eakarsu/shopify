import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isPasswordValid } from "@/lib/password-validation"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
    }

    // Validate password strength
    const passwordCheck = isPasswordValid(password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.errors[0] }, { status: 400 })
    }

    const account = await prisma.customerAccount.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() }
      }
    })

    if (!account) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.customerAccount.update({
      where: { id: account.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpires: null
      }
    })

    return NextResponse.json({ message: "Password has been reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
