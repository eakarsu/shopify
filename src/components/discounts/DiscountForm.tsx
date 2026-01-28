"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createDiscount, updateDiscount } from "@/lib/actions/discounts"

interface DiscountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discount?: {
    id: string
    code: string
    type: string
    value: number
    minPurchaseAmount: number | null
    usageLimit: number | null
    onePerCustomer: boolean
    startDate: string
    endDate: string | null
    status: string
  }
}

export function DiscountForm({ open, onOpenChange, discount }: DiscountFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    code: discount?.code || "",
    type: discount?.type || "PERCENTAGE",
    value: discount?.value?.toString() || "",
    minPurchaseAmount: discount?.minPurchaseAmount?.toString() || "",
    usageLimit: discount?.usageLimit?.toString() || "",
    onePerCustomer: discount?.onePerCustomer || false,
    startDate: discount?.startDate ? new Date(discount.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    endDate: discount?.endDate ? new Date(discount.endDate).toISOString().split("T")[0] : ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = {
        code: formData.code,
        type: formData.type as "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING",
        value: parseFloat(formData.value) || 0,
        minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        onePerCustomer: formData.onePerCustomer,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      }

      if (discount) {
        await updateDiscount(discount.id, data)
      } else {
        await createDiscount(data)
      }

      onOpenChange(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to save discount")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{discount ? "Edit Discount" : "Create Discount"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Discount code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SAVE20"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                    <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">
                  {formData.type === "PERCENTAGE" ? "Percentage *" : "Amount *"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step={formData.type === "PERCENTAGE" ? "1" : "0.01"}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === "PERCENTAGE" ? "10" : "10.00"}
                  required={formData.type !== "FREE_SHIPPING"}
                  disabled={formData.type === "FREE_SHIPPING"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPurchaseAmount">Minimum purchase</Label>
                <Input
                  id="minPurchaseAmount"
                  type="number"
                  step="0.01"
                  value={formData.minPurchaseAmount}
                  onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="onePerCustomer"
                checked={formData.onePerCustomer}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, onePerCustomer: checked as boolean })
                }
              />
              <Label htmlFor="onePerCustomer" className="font-normal">
                Limit to one use per customer
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : discount ? "Save changes" : "Create discount"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
