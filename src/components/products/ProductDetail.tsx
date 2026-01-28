"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Package, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, getStatusColor } from "@/lib/utils"

interface ProductDetailProps {
  product: {
    id: string
    title: string
    description: string | null
    price: any
    compareAtPrice: any
    costPerItem: any
    status: string
    vendor: string | null
    productType: string | null
    tags: string[]
    images: string[]
    variants: {
      id: string
      title: string
      sku: string | null
      price: any
      inventoryQuantity: number
      option1: string | null
      option2: string | null
      option3: string | null
      inventory: {
        quantity: number
        location: { name: string }
      }[]
    }[]
    collectionProducts: {
      collection: { id: string; title: string }
    }[]
  }
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{product.title}</h1>
              <Badge className={getStatusColor(product.status)} variant="secondary">
                {product.status.toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Discard</Button>
          <Button>Save</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" defaultValue={product.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  defaultValue={product.description || ""}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent>
              {product.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {product.images.map((image, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
                  <div className="text-center">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No images</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    defaultValue={Number(product.price)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compareAtPrice">Compare at price</Label>
                  <Input
                    id="compareAtPrice"
                    type="number"
                    step="0.01"
                    defaultValue={product.compareAtPrice ? Number(product.compareAtPrice) : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPerItem">Cost per item</Label>
                  <Input
                    id="costPerItem"
                    type="number"
                    step="0.01"
                    defaultValue={product.costPerItem ? Number(product.costPerItem) : ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Inventory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => (
                    <TableRow key={variant.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{variant.title}</TableCell>
                      <TableCell>{variant.sku || "-"}</TableCell>
                      <TableCell>{formatCurrency(variant.price)}</TableCell>
                      <TableCell>{variant.inventoryQuantity} in stock</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select defaultValue={product.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productType">Product type</Label>
                <Input id="productType" defaultValue={product.productType || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input id="vendor" defaultValue={product.vendor || ""} />
              </div>
              <div className="space-y-2">
                <Label>Collections</Label>
                <div className="flex flex-wrap gap-2">
                  {product.collectionProducts.length > 0 ? (
                    product.collectionProducts.map((cp) => (
                      <Badge key={cp.collection.id} variant="secondary">
                        {cp.collection.title}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No collections</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {product.tags.length > 0 ? (
                    product.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
