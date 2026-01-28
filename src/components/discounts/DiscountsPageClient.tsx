"use client"

import { useState } from "react"
import { DiscountsTable } from "./DiscountsTable"
import { DiscountForm } from "./DiscountForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Tag, CheckCircle, Clock, XCircle } from "lucide-react"

interface DiscountsPageClientProps {
  discounts: any[]
  stats: { total: number; active: number; scheduled: number; expired: number }
}

export function DiscountsPageClient({ discounts, stats }: DiscountsPageClientProps) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts"
        description="Manage discount codes and promotions"
        action={{ label: "Create discount", onClick: () => setFormOpen(true) }}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <Tag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total discounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-gray-100 p-2">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.expired}</p>
              <p className="text-sm text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DiscountsTable discounts={discounts} />

      <DiscountForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
