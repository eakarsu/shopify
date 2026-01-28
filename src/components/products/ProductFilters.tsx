"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface ProductFiltersProps {
  stats: {
    total: number
    active: number
    draft: number
    archived: number
  }
  currentStatus?: string
}

export function ProductFilters({ stats, currentStatus = "all" }: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams)
    if (status === "all") {
      params.delete("status")
    } else {
      params.set("status", status)
    }
    router.push(`/products?${params.toString()}`)
  }

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set("search", value)
    } else {
      params.delete("search")
    }
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <Tabs value={currentStatus} onValueChange={handleStatusChange}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({stats.draft})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({stats.archived})</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          className="pl-9"
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
