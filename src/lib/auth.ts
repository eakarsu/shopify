import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.isActive) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          type: "admin"
        }
      }
    }),
    CredentialsProvider({
      id: "customer-login",
      name: "Customer Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const account = await prisma.customerAccount.findUnique({
          where: { email: credentials.email },
          include: { customer: true }
        })

        if (!account) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, account.password)

        if (!isValid) {
          return null
        }

        return {
          id: account.id,
          email: account.email,
          name: `${account.customer.firstName} ${account.customer.lastName}`,
          customerId: account.customerId,
          type: "customer"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.userRole = (user as any).role
        token.userType = (user as any).type
        token.custId = (user as any).customerId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub as string
        (session.user as any).role = token.userRole as string
        (session.user as any).type = token.userType as string
        (session.user as any).customerId = token.custId as string
      }
      return session
    }
  },
  // Don't set default signIn page since we have both /login (customer) and /login-admin (admin)
  // pages: {
  //   signIn: "/login",
  //   error: "/login"
  // },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: (() => {
    if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET is required in production")
    }
    return undefined
  })()
}
