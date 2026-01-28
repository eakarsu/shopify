import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { ProductDetail } from "@/components/storefront/ProductDetail"

interface ProductPageProps {
  params: { slug: string }
}

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { handle: slug },
    include: {
      variants: {
        include: {
          inventory: {
            include: { location: true }
          }
        }
      },
      reviews: {
        where: { isApproved: true },
        include: {
          customer: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  })
}

async function getRelatedProducts(productType: string | null, productId: string) {
  if (!productType) return []

  return prisma.product.findMany({
    where: {
      productType,
      id: { not: productId },
      status: "ACTIVE"
    },
    take: 4
  })
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(product.productType, product.id)

  const serializedProduct = {
    ...product,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    variants: product.variants.map(v => ({
      ...v,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null
    })),
    reviews: product.reviews.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString()
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductDetail product={serializedProduct} relatedProducts={relatedProducts} />
    </div>
  )
}
