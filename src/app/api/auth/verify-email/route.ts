import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 })
    }

    const account = await prisma.customerAccount.findFirst({
      where: { verifyToken: token }
    })

    if (!account) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
    }

    if (account.emailVerified) {
      return NextResponse.json({ message: "Email is already verified" })
    }

    await prisma.customerAccount.update({
      where: { id: account.id },
      data: {
        emailVerified: true,
        verifyToken: null
      }
    })

    return NextResponse.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Verify email error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
