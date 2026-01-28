import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { DiscountsPageClient } from "@/components/discounts/DiscountsPageClient"

async function getDiscounts() {
  return db.discount.findMany({
    orderBy: { createdAt: "desc" }
  })
}

async function getDiscountStats() {
  const [total, active, scheduled, expired] = await Promise.all([
    db.discount.count(),
    db.discount.count({ where: { status: "ACTIVE" } }),
    db.discount.count({ where: { status: "SCHEDULED" } }),
    db.discount.count({ where: { status: "EXPIRED" } })
  ])
  return { total, active, scheduled, expired }
}

export default async function DiscountsPage() {
  const [discounts, stats] = await Promise.all([
    getDiscounts(),
    getDiscountStats()
  ])

  return (
    <DiscountsPageClient
      discounts={serialize(discounts)}
      stats={stats}
    />
  )
}
