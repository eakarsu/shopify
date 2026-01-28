"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function createCustomer(data: {
  email: string
  firstName: string
  lastName: string
  phone?: string
  company?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  notes?: string
  tags?: string[]
  acceptsMarketing?: boolean
}) {
  const customer = await db.customer.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      company: data.company,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || "US",
      notes: data.notes,
      tags: data.tags || [],
      acceptsMarketing: data.acceptsMarketing ?? false
    }
  })

  revalidatePath("/customers")
  revalidatePath("/dashboard")
  return customer
}

export async function updateCustomer(id: string, data: {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string | null
  company?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  notes?: string | null
  tags?: string[]
  acceptsMarketing?: boolean
}) {
  const customer = await db.customer.update({
    where: { id },
    data
  })

  revalidatePath("/customers")
  revalidatePath(`/customers/${id}`)
  return customer
}

export async function deleteCustomer(id: string) {
  await db.customer.delete({
    where: { id }
  })

  revalidatePath("/customers")
  revalidatePath("/dashboard")
}

export async function deleteCustomers(ids: string[]) {
  await db.customer.deleteMany({
    where: { id: { in: ids } }
  })

  revalidatePath("/customers")
  revalidatePath("/dashboard")
}

export async function addCustomerTag(id: string, tag: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    select: { tags: true }
  })

  if (customer && !customer.tags.includes(tag)) {
    await db.customer.update({
      where: { id },
      data: {
        tags: [...customer.tags, tag]
      }
    })
  }

  revalidatePath(`/customers/${id}`)
}

export async function removeCustomerTag(id: string, tag: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    select: { tags: true }
  })

  if (customer) {
    await db.customer.update({
      where: { id },
      data: {
        tags: customer.tags.filter(t => t !== tag)
      }
    })
  }

  revalidatePath(`/customers/${id}`)
}
