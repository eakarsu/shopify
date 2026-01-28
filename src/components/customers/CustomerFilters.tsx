"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Users, UserPlus, UserCheck } from "lucide-react"

interface CustomerFiltersProps {
  stats: {
    total: number
    newThisMonth: number
    returning: number
  }
  searchParams: {
    search?: string
  }
}

export function CustomerFilters({ stats, searchParams }: CustomerFiltersProps) {
  const router = useRouter()

  const handleSearch = (value: string) => {
    const params = new URLSearchParams()
    if (value) {
      params.set("search", value)
    }
    router.push(`/customers?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-green-100 p-2">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.newThisMonth}</p>
              <p className="text-sm text-muted-foreground">New this month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-purple-100 p-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.returning}</p>
              <p className="text-sm text-muted-foreground">Returning customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          className="pl-9"
          defaultValue={searchParams.search || ""}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
