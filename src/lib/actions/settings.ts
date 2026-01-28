"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function saveSetting(key: string, value: string) {
  await db.storeSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  })

  revalidatePath("/settings")
}

export async function saveSettings(settings: Record<string, string>) {
  for (const [key, value] of Object.entries(settings)) {
    await db.storeSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value }
    })
  }

  revalidatePath("/settings")
}

export async function saveStoreDetails(data: {
  storeName?: string
  storeEmail?: string
  storePhone?: string
  storeAddress?: string
  storeCity?: string
  storeState?: string
  storePostal?: string
  storeCountry?: string
  currency?: string
}) {
  const settings: Record<string, string> = {}

  if (data.storeName) settings.storeName = data.storeName
  if (data.storeEmail) settings.storeEmail = data.storeEmail
  if (data.storePhone) settings.storePhone = data.storePhone
  if (data.storeAddress) settings.storeAddress = data.storeAddress
  if (data.storeCity) settings.storeCity = data.storeCity
  if (data.storeState) settings.storeState = data.storeState
  if (data.storePostal) settings.storePostal = data.storePostal
  if (data.storeCountry) settings.storeCountry = data.storeCountry
  if (data.currency) settings.currency = data.currency

  await saveSettings(settings)
}

export async function deleteSetting(key: string) {
  await db.storeSetting.delete({
    where: { key }
  })

  revalidatePath("/settings")
}

export async function getSetting(key: string): Promise<string | null> {
  const setting = await db.storeSetting.findUnique({
    where: { key }
  })

  return setting?.value || null
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await db.storeSetting.findMany()

  return settings.reduce((acc, s) => {
    acc[s.key] = s.value
    return acc
  }, {} as Record<string, string>)
}
