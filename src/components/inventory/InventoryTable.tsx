"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Package, Search, Edit } from "lucide-react"
import { adjustInventory } from "@/lib/actions/inventory"

interface InventoryItem {
  id: string
  title: string
  sku: string | null
  inventoryQuantity: number
  product: {
    id: string
    title: string
    images: string[]
  }
  inventory: {
    quantity: number
    location: { id: string; name: string }
  }[]
}

interface Location {
  id: string
  name: string
  _count: { inventory: number }
}

interface InventoryTableProps {
  inventory: InventoryItem[]
  locations: Location[]
}

export function InventoryTable({ inventory, locations }: InventoryTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const filteredInventory = inventory.filter(item =>
    item.product.title.toLowerCase().includes(search.toLowerCase()) ||
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return { label: "Out of stock", color: "bg-red-100 text-red-800" }
    if (quantity < 10) return { label: "Low stock", color: "bg-yellow-100 text-yellow-800" }
    return { label: "In stock", color: "bg-green-100 text-green-800" }
  }

  const handleAdjust = (item: InventoryItem) => {
    setSelectedItem(item)
    const initialQuantities: Record<string, number> = {}
    locations.forEach(loc => {
      const inv = item.inventory.find(i => i.location.id === loc.id)
      initialQuantities[loc.id] = inv?.quantity ?? 0
    })
    setQuantities(initialQuantities)
    setAdjustmentOpen(true)
  }

  const handleSave = async () => {
    if (!selectedItem) return
    setSaving(true)
    try {
      for (const [locationId, newQuantity] of Object.entries(quantities)) {
        const inv = selectedItem.inventory.find(i => i.location.id === locationId)
        const currentQuantity = inv?.quantity ?? 0
        const adjustment = newQuantity - currentQuantity

        if (adjustment !== 0) {
          await adjustInventory(selectedItem.id, locationId, newQuantity)
        }
      }
      router.refresh()
      setAdjustmentOpen(false)
    } catch (error) {
      console.error("Failed to adjust inventory:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product, variant, or SKU..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Available</TableHead>
              {locations.map(loc => (
                <TableHead key={loc.id} className="text-right">{loc.name}</TableHead>
              ))}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => {
              const status = getStockStatus(item.inventoryQuantity)
              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/products/${item.product.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {item.product.images[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.title}
                            className="h-10 w-10 object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.product.title}</p>
                        {item.title !== "Default" && (
                          <p className="text-sm text-muted-foreground">{item.title}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.sku || "-"}</TableCell>
                  <TableCell>
                    <Badge className={status.color} variant="secondary">
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.inventoryQuantity}
                  </TableCell>
                  {locations.map(loc => {
                    const inv = item.inventory.find(i => i.location.id === loc.id)
                    return (
                      <TableCell key={loc.id} className="text-right">
                        {inv?.quantity ?? 0}
                      </TableCell>
                    )
                  })}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAdjust(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {selectedItem.product.images[0] ? (
                    <img
                      src={selectedItem.product.images[0]}
                      alt=""
                      className="h-12 w-12 object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedItem.product.title}</p>
                  {selectedItem.title !== "Default" && (
                    <p className="text-sm text-muted-foreground">{selectedItem.title}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {locations.map(loc => (
                  <div key={loc.id} className="flex items-center gap-4">
                    <Label className="w-32">{loc.name}</Label>
                    <Input
                      type="number"
                      value={quantities[loc.id] ?? 0}
                      onChange={(e) => setQuantities({
                        ...quantities,
                        [loc.id]: parseInt(e.target.value) || 0
                      })}
                      className="w-24"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
