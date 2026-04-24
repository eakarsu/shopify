"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatCurrency, getStatusColor } from "@/lib/utils"
import { Package, MoreHorizontal, Trash2, CheckCircle, Archive, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteProduct } from "@/lib/actions/products"
import { bulkUpdateProductStatus, bulkDeleteProducts } from "@/lib/actions/bulk"
import { ProductForm } from "./ProductForm"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: string
  title: string
  description: string | null
  status: string
  vendor: string | null
  productType: string | null
  price: any
  compareAtPrice: any
  images: string[]
  tags: string[]
  variants: { id: string; inventoryQuantity: number }[]
  _count: { orderItems: number }
}

interface ProductsTableProps {
  products: Product[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const getTotalInventory = (variants: { inventoryQuantity: number }[]) => {
    return variants.reduce((sum, v) => sum + v.inventoryQuantity, 0)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.length === products.length ? [] : products.map(p => p.id)
    )
  }

  const handleDelete = async () => {
    if (!selectedProduct) return
    setDeleting(true)
    try {
      await deleteProduct(selectedProduct.id)
      toast({ title: "Product deleted", description: `"${selectedProduct.title}" has been deleted`, variant: "success" })
      router.refresh()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
      setSelectedProduct(null)
    }
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setEditOpen(true)
  }

  const confirmDelete = (product: Product) => {
    setSelectedProduct(product)
    setDeleteOpen(true)
  }

  const handleBulkStatusUpdate = async (status: "ACTIVE" | "DRAFT" | "ARCHIVED") => {
    try {
      await bulkUpdateProductStatus(selectedIds, status)
      toast({ title: "Products updated", description: `${selectedIds.length} products set to ${status.toLowerCase()}`, variant: "success" })
      setSelectedIds([])
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to update products", variant: "destructive" })
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteProducts(selectedIds)
      toast({ title: "Products deleted", description: `${selectedIds.length} products deleted`, variant: "success" })
      setSelectedIds([])
      setBulkDeleteOpen(false)
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to delete products", variant: "destructive" })
    }
  }

  if (products.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <Package className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No products found</h3>
        <p className="text-sm text-muted-foreground">Get started by adding your first product.</p>
      </div>
    )
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-blue-50 p-3 mb-4">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-4">
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate("ACTIVE")}>
              <CheckCircle className="mr-1 h-3 w-3" /> Set Active
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate("DRAFT")}>
              Set Draft
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate("ARCHIVED")}>
              <Archive className="mr-1 h-3 w-3" /> Archive
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds([])}>
            <XCircle className="mr-1 h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === products.length && products.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className="cursor-pointer"
                onClick={() => router.push(`/products/${product.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    onCheckedChange={() => toggleSelect(product.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-10 w-10 object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(product.status)} variant="secondary">
                    {product.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getTotalInventory(product.variants)} in stock
                </TableCell>
                <TableCell>{product.productType || "-"}</TableCell>
                <TableCell>{product.vendor || "-"}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(product)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/products/${product.id}`)}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => confirmDelete(product)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Single Product Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{selectedProduct?.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} products?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected products. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedIds.length} products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedProduct && (
        <ProductForm
          open={editOpen}
          onOpenChange={setEditOpen}
          product={{
            id: selectedProduct.id,
            title: selectedProduct.title,
            description: selectedProduct.description,
            price: Number(selectedProduct.price),
            compareAtPrice: selectedProduct.compareAtPrice ? Number(selectedProduct.compareAtPrice) : null,
            status: selectedProduct.status,
            vendor: selectedProduct.vendor,
            productType: selectedProduct.productType,
            tags: selectedProduct.tags
          }}
        />
      )}
    </>
  )
}
