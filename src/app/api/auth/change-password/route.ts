import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPasswordValid } from "@/lib/password-validation"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 })
    }

    // Validate new password strength
    const passwordCheck = isPasswordValid(newPassword)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.errors[0] }, { status: 400 })
    }

    const userType = (session.user as any).type

    if (userType === "admin") {
      const user = await prisma.user.findUnique({
        where: { id: (session.user as any).id }
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })
    } else {
      const account = await prisma.customerAccount.findUnique({
        where: { id: (session.user as any).id }
      })

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }

      const isValid = await bcrypt.compare(currentPassword, account.password)
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await prisma.customerAccount.update({
        where: { id: account.id },
        data: { password: hashedPassword }
      })
    }

    return NextResponse.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
