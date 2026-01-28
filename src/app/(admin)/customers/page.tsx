import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { CustomersPageClient } from "@/components/customers/CustomersPageClient"

interface CustomersPageProps {
  searchParams: { search?: string }
}

async function getCustomers(searchParams: CustomersPageProps["searchParams"]) {
  const where: any = {}

  if (searchParams.search) {
    where.OR = [
      { firstName: { contains: searchParams.search, mode: "insensitive" } },
      { lastName: { contains: searchParams.search, mode: "insensitive" } },
      { email: { contains: searchParams.search, mode: "insensitive" } },
    ]
  }

  return db.customer.findMany({
    where,
    include: {
      _count: { select: { orders: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  })
}

async function getCustomerStats() {
  const [total, newThisMonth, returning] = await Promise.all([
    db.customer.count(),
    db.customer.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    db.customer.count({ where: { totalOrders: { gt: 1 } } })
  ])
  return { total, newThisMonth, returning }
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const [customers, stats] = await Promise.all([
    getCustomers(searchParams),
    getCustomerStats()
  ])

  return (
    <CustomersPageClient
      customers={serialize(customers)}
      stats={stats}
      searchParams={searchParams}
    />
  )
}
