"use client"

import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface OrderFiltersProps {
  stats: {
    total: number
    unfulfilled: number
    paid: number
    pending: number
  }
  searchParams: {
    status?: string
    financial?: string
    fulfillment?: string
    search?: string
  }
}

export function OrderFilters({ stats, searchParams }: OrderFiltersProps) {
  const router = useRouter()

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/orders?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Tabs
        value={searchParams.fulfillment || "all"}
        onValueChange={(v) => updateParams("fulfillment", v)}
      >
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="unfulfilled">Unfulfilled ({stats.unfulfilled})</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select
        value={searchParams.financial || "all"}
        onValueChange={(v) => updateParams("financial", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Payment status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All payments</SelectItem>
          <SelectItem value="paid">Paid ({stats.paid})</SelectItem>
          <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
          <SelectItem value="refunded">Refunded</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          className="pl-9"
          defaultValue={searchParams.search || ""}
          onChange={(e) => updateParams("search", e.target.value)}
        />
      </div>
    </div>
  )
}
