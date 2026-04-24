"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { Users, MoreHorizontal, Trash2, XCircle } from "lucide-react"
import { deleteCustomer } from "@/lib/actions/customers"
import { bulkDeleteCustomers } from "@/lib/actions/bulk"
import { CustomerForm } from "./CustomerForm"
import { useToast } from "@/hooks/use-toast"

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  company: string | null
  address1: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  notes: string | null
  acceptsMarketing: boolean
  totalOrders: number
  totalSpent: any
  createdAt: Date
  _count: { orders: number }
}

interface CustomersTableProps {
  customers: Customer[]
}

export function CustomersTable({ customers }: CustomersTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.length === customers.length ? [] : customers.map(c => c.id)
    )
  }

  const handleDelete = async () => {
    if (!selectedCustomer) return
    setDeleting(true)
    try {
      await deleteCustomer(selectedCustomer.id)
      toast({ title: "Customer deleted", description: `${selectedCustomer.firstName} ${selectedCustomer.lastName} has been deleted`, variant: "success" })
      router.refresh()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete customer", variant: "destructive" })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
      setSelectedCustomer(null)
    }
  }

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditOpen(true)
  }

  const confirmDelete = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDeleteOpen(true)
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteCustomers(selectedIds)
      toast({ title: "Customers deleted", description: `${selectedIds.length} customers deleted`, variant: "success" })
      setSelectedIds([])
      setBulkDeleteOpen(false)
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to delete customers", variant: "destructive" })
    }
  }

  if (customers.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <Users className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No customers found</h3>
        <p className="text-sm text-muted-foreground">Customers will appear here after their first order.</p>
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
                  checked={selectedIds.length === customers.length && customers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Amount spent</TableHead>
              <TableHead>Customer since</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow
                key={customer.id}
                className="cursor-pointer"
                onClick={() => router.push(`/customers/${customer.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(customer.id)}
                    onCheckedChange={() => toggleSelect(customer.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {getInitials(customer.firstName, customer.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {customer.city && customer.country
                    ? `${customer.city}, ${customer.country}`
                    : customer.country || "-"}
                </TableCell>
                <TableCell>{customer._count.orders} orders</TableCell>
                <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(customer.createdAt)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(customer)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => confirmDelete(customer)}
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

      {/* Delete Single Customer Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCustomer?.firstName} {selectedCustomer?.lastName}. This action cannot be undone.
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
            <AlertDialogTitle>Delete {selectedIds.length} customers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected customers and their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedIds.length} customers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCustomer && (
        <CustomerForm
          open={editOpen}
          onOpenChange={setEditOpen}
          customer={{
            id: selectedCustomer.id,
            firstName: selectedCustomer.firstName,
            lastName: selectedCustomer.lastName,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone,
            company: selectedCustomer.company,
            address1: selectedCustomer.address1,
            city: selectedCustomer.city,
            state: selectedCustomer.state,
            postalCode: selectedCustomer.postalCode,
            country: selectedCustomer.country,
            notes: selectedCustomer.notes,
            acceptsMarketing: selectedCustomer.acceptsMarketing
          }}
        />
      )}
    </>
  )
}
