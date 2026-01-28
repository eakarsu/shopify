import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { InventoryTable } from "@/components/inventory/InventoryTable"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Warehouse, AlertTriangle, Package, MapPin } from "lucide-react"

async function getInventory() {
  return db.variant.findMany({
    include: {
      product: true,
      inventory: {
        include: { location: true }
      }
    },
    orderBy: [
      { inventoryQuantity: "asc" }
    ]
  })
}

async function getLocations() {
  return db.location.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { inventory: true } }
    }
  })
}

async function getInventoryStats() {
  const [totalItems, lowStock, outOfStock, locations] = await Promise.all([
    db.variant.aggregate({ _sum: { inventoryQuantity: true } }),
    db.variant.count({ where: { inventoryQuantity: { gt: 0, lt: 10 } } }),
    db.variant.count({ where: { inventoryQuantity: { lte: 0 } } }),
    db.location.count({ where: { isActive: true } })
  ])
  return {
    totalItems: totalItems._sum.inventoryQuantity || 0,
    lowStock,
    outOfStock,
    locations
  }
}

export default async function InventoryPage() {
  const [inventory, locations, stats] = await Promise.all([
    getInventory(),
    getLocations(),
    getInventoryStats()
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage your product inventory across locations"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-yellow-100 p-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.lowStock}</p>
              <p className="text-sm text-muted-foreground">Low stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-red-100 p-2">
              <Warehouse className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.outOfStock}</p>
              <p className="text-sm text-muted-foreground">Out of stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-green-100 p-2">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.locations}</p>
              <p className="text-sm text-muted-foreground">Locations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <InventoryTable inventory={serialize(inventory)} locations={serialize(locations)} />
    </div>
  )
}
