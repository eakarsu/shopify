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
import { Package, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteProduct } from "@/lib/actions/products"
import { ProductForm } from "./ProductForm"

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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const getTotalInventory = (variants: { inventoryQuantity: number }[]) => {
    return variants.reduce((sum, v) => sum + v.inventoryQuantity, 0)
  }

  const handleDelete = async () => {
    if (!selectedProduct) return
    setDeleting(true)
    try {
      await deleteProduct(selectedProduct.id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete product:", error)
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
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
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
                  <Checkbox />
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedProduct?.title}". This action cannot be undone.
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
