import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { CollectionsPageClient } from "@/components/collections/CollectionsPageClient"

async function getCollections() {
  return db.collection.findMany({
    include: {
      _count: { select: { products: true } }
    },
    orderBy: { createdAt: "desc" }
  })
}

export default async function CollectionsPage() {
  const collections = await getCollections()

  return (
    <CollectionsPageClient collections={serialize(collections)} />
  )
}
