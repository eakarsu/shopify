"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { MapPin, Edit, Trash2, Plus } from "lucide-react"

interface Location {
  id: string
  name: string
  address1: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  phone: string | null
  isActive: boolean
  isDefault: boolean
}

interface LocationsSettingsProps {
  locations: Location[]
}

export function LocationsSettings({ locations }: LocationsSettingsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const handleEdit = (location: Location) => {
    setSelectedLocation(location)
    setEditOpen(true)
  }

  const handleAdd = () => {
    setSelectedLocation(null)
    setEditOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory Locations</CardTitle>
            <CardDescription>
              Manage where you stock and ship inventory from
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                onClick={() => handleEdit(location)}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-muted p-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{location.name}</p>
                      {location.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {!location.isActive && (
                        <Badge variant="outline" className="text-yellow-600">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[location.address1, location.city, location.state, location.country]
                        .filter(Boolean)
                        .join(", ") || "No address"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!location.isDefault && (
                    <Button variant="ghost" size="icon" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Location name</Label>
              <Input
                defaultValue={selectedLocation?.name || ""}
                placeholder="e.g., Main Warehouse"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                defaultValue={selectedLocation?.address1 || ""}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input defaultValue={selectedLocation?.city || ""} />
              </div>
              <div className="space-y-2">
                <Label>State/Province</Label>
                <Input defaultValue={selectedLocation?.state || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input defaultValue={selectedLocation?.postalCode || ""} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input defaultValue={selectedLocation?.country || "US"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                defaultValue={selectedLocation?.phone || ""}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setEditOpen(false)}>
              {selectedLocation ? "Save changes" : "Add location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
