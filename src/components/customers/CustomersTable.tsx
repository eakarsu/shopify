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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { Users, MoreHorizontal } from "lucide-react"
import { deleteCustomer } from "@/lib/actions/customers"
import { CustomerForm } from "./CustomerForm"

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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedCustomer) return
    setDeleting(true)
    try {
      await deleteCustomer(selectedCustomer.id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete customer:", error)
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
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
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
                  <Checkbox />
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
