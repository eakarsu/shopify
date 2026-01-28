"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { Tag, MoreHorizontal, Copy, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteDiscount } from "@/lib/actions/discounts"
import { DiscountForm } from "./DiscountForm"

interface Discount {
  id: string
  code: string
  type: string
  value: any
  minPurchaseAmount: any
  usageLimit: number | null
  usageCount: number
  onePerCustomer: boolean
  startDate: Date
  endDate: Date | null
  status: string
}

interface DiscountsTableProps {
  discounts: Discount[]
}

export function DiscountsTable({ discounts }: DiscountsTableProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const formatDiscountValue = (discount: Discount) => {
    if (discount.type === "PERCENTAGE") {
      return `${Number(discount.value)}% off`
    } else if (discount.type === "FIXED_AMOUNT") {
      return `${formatCurrency(discount.value)} off`
    } else {
      return "Free shipping"
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  const handleEdit = (discount: Discount) => {
    setSelectedDiscount(discount)
    setEditOpen(true)
  }

  const confirmDelete = (discount: Discount) => {
    setSelectedDiscount(discount)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedDiscount) return
    setDeleting(true)
    try {
      await deleteDiscount(selectedDiscount.id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete discount:", error)
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
      setSelectedDiscount(null)
    }
  }

  if (discounts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <Tag className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No discounts found</h3>
        <p className="text-sm text-muted-foreground">Create your first discount code to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Minimum</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map((discount) => (
              <TableRow
                key={discount.id}
                className="cursor-pointer"
                onClick={() => handleEdit(discount)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                      {discount.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyCode(discount.code)
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{formatDiscountValue(discount)}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(discount.status)} variant="secondary">
                    {discount.status.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {discount.usageCount}
                  {discount.usageLimit && ` / ${discount.usageLimit}`}
                </TableCell>
                <TableCell>
                  {discount.minPurchaseAmount
                    ? formatCurrency(discount.minPurchaseAmount)
                    : "None"}
                </TableCell>
                <TableCell>{formatDate(discount.startDate)}</TableCell>
                <TableCell>
                  {discount.endDate ? formatDate(discount.endDate) : "No end date"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(discount)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyCode(discount.code)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy code
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => confirmDelete(discount)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
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
            <AlertDialogTitle>Delete discount?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the discount code "{selectedDiscount?.code}". This action cannot be undone.
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

      {selectedDiscount && (
        <DiscountForm
          open={editOpen}
          onOpenChange={setEditOpen}
          discount={{
            id: selectedDiscount.id,
            code: selectedDiscount.code,
            type: selectedDiscount.type,
            value: Number(selectedDiscount.value),
            minPurchaseAmount: selectedDiscount.minPurchaseAmount ? Number(selectedDiscount.minPurchaseAmount) : null,
            usageLimit: selectedDiscount.usageLimit,
            onePerCustomer: selectedDiscount.onePerCustomer,
            startDate: new Date(selectedDiscount.startDate).toISOString(),
            endDate: selectedDiscount.endDate ? new Date(selectedDiscount.endDate).toISOString() : null,
            status: selectedDiscount.status
          }}
        />
      )}
    </>
  )
}
