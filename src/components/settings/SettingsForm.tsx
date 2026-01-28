"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { saveStoreDetails, saveSetting } from "@/lib/actions/settings"

interface SettingsFormProps {
  settings: Record<string, string>
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [formData, setFormData] = useState({
    storeName: settings.storeName || "My Store",
    storeEmail: settings.storeEmail || "",
    storePhone: settings.storePhone || "",
    storeAddress: settings.storeAddress || "",
    storeCity: settings.storeCity || "",
    storeState: settings.storeState || "",
    storePostal: settings.storePostal || "",
    storeCountry: settings.storeCountry || "United States",
    currency: settings.currency || "USD"
  })

  const handleSaveDetails = async () => {
    setSaving(true)
    try {
      await saveStoreDetails({
        storeName: formData.storeName,
        storeEmail: formData.storeEmail,
        storePhone: formData.storePhone,
        storeAddress: formData.storeAddress,
        storeCity: formData.storeCity,
        storeState: formData.storeState,
        storePostal: formData.storePostal,
        storeCountry: formData.storeCountry
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to save settings:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCurrency = async () => {
    setSavingCurrency(true)
    try {
      await saveSetting("currency", formData.currency)
      router.refresh()
    } catch (error) {
      console.error("Failed to save currency:", error)
    } finally {
      setSavingCurrency(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
          <CardDescription>
            Basic information about your store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store name</Label>
              <Input
                id="storeName"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeEmail">Contact email</Label>
              <Input
                id="storeEmail"
                type="email"
                value={formData.storeEmail}
                onChange={(e) => setFormData({ ...formData, storeEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="storePhone">Phone number</Label>
            <Input
              id="storePhone"
              type="tel"
              value={formData.storePhone}
              onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="storeAddress">Address</Label>
            <Input
              id="storeAddress"
              value={formData.storeAddress}
              onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="storeCity">City</Label>
              <Input
                id="storeCity"
                value={formData.storeCity}
                onChange={(e) => setFormData({ ...formData, storeCity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeState">State/Province</Label>
              <Input
                id="storeState"
                value={formData.storeState}
                onChange={(e) => setFormData({ ...formData, storeState: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePostal">Postal code</Label>
              <Input
                id="storePostal"
                value={formData.storePostal}
                onChange={(e) => setFormData({ ...formData, storePostal: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeCountry">Country</Label>
            <Input
              id="storeCountry"
              value={formData.storeCountry}
              onChange={(e) => setFormData({ ...formData, storeCountry: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveDetails} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Store Currency</CardTitle>
          <CardDescription>
            The currency your products are sold in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-32"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveCurrency} disabled={savingCurrency}>
              {savingCurrency ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
