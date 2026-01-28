"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

interface RegisterCustomerData {
  firstName: string
  lastName: string
  email: string
  password: string
}

export async function registerCustomer(data: RegisterCustomerData) {
  try {
    // Check if email already exists
    const existingAccount = await prisma.customerAccount.findUnique({
      where: { email: data.email }
    })

    if (existingAccount) {
      return { success: false, error: "Email already registered" }
    }

    // Check if customer exists
    let customer = await prisma.customer.findFirst({
      where: { email: data.email }
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName
        }
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create customer account
    await prisma.customerAccount.create({
      data: {
        customerId: customer.id,
        email: data.email,
        password: hashedPassword
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Register customer error:", error)
    return { success: false, error: "Failed to create account" }
  }
}
