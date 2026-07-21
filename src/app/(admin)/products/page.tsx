import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { ProductsPageClient } from "@/components/products/ProductsPageClient"

interface ProductsPageProps {
  searchParams: Promise<{ status?: string; search?: string }>
}

async function getProducts(searchParams: Awaited<ProductsPageProps["searchParams"]>) {
  const where: any = {}

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status.toUpperCase()
  }

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: "insensitive" } },
      { vendor: { contains: searchParams.search, mode: "insensitive" } },
      { productType: { contains: searchParams.search, mode: "insensitive" } },
    ]
  }

  return db.product.findMany({
    where,
    include: {
      variants: true,
      _count: { select: { orderItems: true } }
    },
    orderBy: { createdAt: "desc" }
  })
}

async function getProductStats() {
  const [total, active, draft, archived] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.product.count({ where: { status: "ARCHIVED" } })
  ])
  return { total, active, draft, archived }
}

export default async function ProductsPage(props: ProductsPageProps) {
  const searchParams = await props.searchParams;
  const [products, stats] = await Promise.all([
    getProducts(searchParams),
    getProductStats()
  ])

  return (
    <ProductsPageClient
      products={serialize(products)}
      stats={stats}
      currentStatus={searchParams.status}
    />
  )
}
