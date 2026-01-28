"use client"

import { useState } from "react"
import { CollectionsGrid } from "./CollectionsGrid"
import { CollectionForm } from "./CollectionForm"
import { PageHeader } from "@/components/layout/PageHeader"

interface CollectionsPageClientProps {
  collections: any[]
}

export function CollectionsPageClient({ collections }: CollectionsPageClientProps) {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description="Organize products into collections"
        action={{ label: "Create collection", onClick: () => setFormOpen(true) }}
      />

      <CollectionsGrid collections={collections} />

      <CollectionForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
