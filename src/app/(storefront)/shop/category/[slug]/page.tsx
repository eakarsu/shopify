import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ArrowLeft } from "lucide-react"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; page?: string }>
}

async function getCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      children: true
    }
  })
}

async function getProducts(categorySlug: string, searchParams: Awaited<CategoryPageProps["searchParams"]>) {
  const { sort, page = "1" } = searchParams
  const pageNum = parseInt(page)
  const perPage = 12

  // Get category and subcategories
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: { children: true }
  })

  if (!category) return { products: [], total: 0, pages: 0, currentPage: 1 }

  // For now, get all active products since products don't have categoryId
  // In a real app, you'd have a productCategory relation
  let orderBy: any = { createdAt: "desc" }
  if (sort === "price-asc") orderBy = { price: "asc" }
  if (sort === "price-desc") orderBy = { price: "desc" }
  if (sort === "name-asc") orderBy = { title: "asc" }
  if (sort === "name-desc") orderBy = { title: "desc" }

  // Filter products by productType matching category name (simple approach)
  const where: any = {
    status: "ACTIVE",
    OR: [
      { productType: { contains: category.name, mode: "insensitive" } },
      { tags: { has: category.name.toLowerCase() } },
      { tags: { has: categorySlug } }
    ]
  }

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

export default async function CategoryPage(props: CategoryPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const category = await getCategory(params.slug)

  if (!category) {
    notFound()
  }

  const { products, total, pages, currentPage } = await getProducts(params.slug, searchParams)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-primary">Shop</Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground">{category.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">{total} products</p>
      </div>

      {/* Subcategories */}
      {category.children.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold mb-4">Subcategories</h2>
          <div className="flex flex-wrap gap-2">
            {category.children.map((sub) => (
              <Link key={sub.id} href={`/shop/category/${sub.slug}`}>
                <Badge variant="outline" className="text-sm py-1.5 px-3 hover:bg-primary hover:text-primary-foreground cursor-pointer">
                  {sub.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

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
          <p className="text-muted-foreground mb-4">No products found in this category</p>
          <Link href="/shop">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse All Products
            </Button>
          </Link>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link href={`/shop/category/${params.slug}?page=${currentPage - 1}`}>
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          {[...Array(pages)].map((_, i) => (
            <Link key={i} href={`/shop/category/${params.slug}?page=${i + 1}`}>
              <Button variant={currentPage === i + 1 ? "default" : "outline"}>
                {i + 1}
              </Button>
            </Link>
          ))}
          {currentPage < pages && (
            <Link href={`/shop/category/${params.slug}?page=${currentPage + 1}`}>
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
