import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { ProductDetail } from "@/components/products/ProductDetail"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

async function getProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      variants: {
        include: {
          inventory: {
            include: { location: true }
          }
        }
      },
      collectionProducts: {
        include: { collection: true }
      }
    }
  })

  if (!product) notFound()
  return product
}

export default async function ProductPage(props: ProductPageProps) {
  const params = await props.params;
  const product = await getProduct(params.id)

  return <ProductDetail product={serialize(product)} />
}
