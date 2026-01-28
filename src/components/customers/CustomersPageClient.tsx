"use client"

import { useState } from "react"
import { CustomersTable } from "./CustomersTable"
import { CustomerForm } from "./CustomerForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { CustomerFilters } from "./CustomerFilters"

interface CustomersPageClientProps {
  customers: any[]
  stats: { total: number; newThisMonth: number; returning: number }
  searchParams: { search?: string }
}

export function CustomersPageClient({ customers, stats, searchParams }: CustomersPageClientProps) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${stats.total} customers in your store`}
        action={{ label: "Add customer", onClick: () => setFormOpen(true) }}
      />

      <CustomerFilters stats={stats} searchParams={searchParams} />

      <CustomersTable customers={customers} />

      <CustomerForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
