import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Star, SlidersHorizontal } from "lucide-react"

interface ShopPageProps {
  searchParams: {
    search?: string
    category?: string
    sort?: string
    page?: string
  }
}

async function getProducts(searchParams: ShopPageProps["searchParams"]) {
  const { search, category, sort, page = "1" } = searchParams
  const pageNum = parseInt(page)
  const perPage = 12

  const where: any = { status: "ACTIVE" }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ]
  }

  // Category filtering removed - products don't have categoryId in schema

  let orderBy: any = { createdAt: "desc" }
  if (sort === "price-asc") orderBy = { price: "asc" }
  if (sort === "price-desc") orderBy = { price: "desc" }
  if (sort === "name-asc") orderBy = { title: "asc" }
  if (sort === "name-desc") orderBy = { title: "desc" }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (pageNum - 1) * perPage,
      take: perPage,
      include: {
        variants: { take: 1 }
      }
    }),
    prisma.product.count({ where })
  ])

  return { products, total, pages: Math.ceil(total / perPage), currentPage: pageNum }
}

async function getCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" }
  })
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [{ products, total, pages, currentPage }, categories] = await Promise.all([
    getProducts(searchParams),
    getCategories()
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <SlidersHorizontal className="h-5 w-5" />
              <h2 className="font-semibold">Filters</h2>
            </div>

            <form action="/shop" method="GET" className="space-y-6">
              {/* Search */}
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  name="search"
                  placeholder="Search products..."
                  defaultValue={searchParams.search}
                />
              </div>

              {/* Categories */}
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <div className="space-y-2">
                  <Link
                    href="/shop"
                    className={`block text-sm ${!searchParams.category ? "font-semibold text-primary" : "hover:text-primary"}`}
                  >
                    All Categories
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/shop?category=${category.id}`}
                      className={`block text-sm ${searchParams.category === category.id ? "font-semibold text-primary" : "hover:text-primary"}`}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full">Apply Filters</Button>
            </form>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">All Products</h1>
              <p className="text-muted-foreground">{total} products found</p>
            </div>
            <Select defaultValue={searchParams.sort || "newest"}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <Link href={`/shop?${new URLSearchParams({ ...searchParams, sort: "newest" })}`}>
                    Newest
                  </Link>
                </SelectItem>
                <SelectItem value="price-asc">
                  <Link href={`/shop?${new URLSearchParams({ ...searchParams, sort: "price-asc" })}`}>
                    Price: Low to High
                  </Link>
                </SelectItem>
                <SelectItem value="price-desc">
                  <Link href={`/shop?${new URLSearchParams({ ...searchParams, sort: "price-desc" })}`}>
                    Price: High to Low
                  </Link>
                </SelectItem>
                <SelectItem value="name-asc">
                  <Link href={`/shop?${new URLSearchParams({ ...searchParams, sort: "name-asc" })}`}>
                    Name: A-Z
                  </Link>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/shop/product/${product.slug}`}
                  className="group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative overflow-hidden bg-gray-100">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                      {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                        <Badge className="absolute top-2 left-2 bg-red-500">
                          Sale
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      <div className="flex items-center gap-1 my-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {formatCurrency(product.price)}
                        </span>
                        {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link href={`/shop?${new URLSearchParams({ ...searchParams, page: String(currentPage - 1) })}`}>
                  <Button variant="outline">Previous</Button>
                </Link>
              )}
              {[...Array(pages)].map((_, i) => (
                <Link
                  key={i}
                  href={`/shop?${new URLSearchParams({ ...searchParams, page: String(i + 1) })}`}
                >
                  <Button
                    variant={currentPage === i + 1 ? "default" : "outline"}
                  >
                    {i + 1}
                  </Button>
                </Link>
              ))}
              {currentPage < pages && (
                <Link href={`/shop?${new URLSearchParams({ ...searchParams, page: String(currentPage + 1) })}`}>
                  <Button variant="outline">Next</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
