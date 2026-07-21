"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FolderOpen, Package, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteCollection } from "@/lib/actions/collections"
import { CollectionForm } from "./CollectionForm"

interface Collection {
  id: string
  title: string
  description: string | null
  image: string | null
  type: string
  published: boolean
  _count: { products: number }
}

interface CollectionsGridProps {
  collections: Collection[]
}

export function CollectionsGrid({ collections }: CollectionsGridProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleEdit = (collection: Collection) => {
    setSelectedCollection(collection)
    setEditOpen(true)
  }

  const confirmDelete = (collection: Collection) => {
    setSelectedCollection(collection)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedCollection) return
    setDeleting(true)
    try {
      await deleteCollection(selectedCollection.id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete collection:", error)
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
      setSelectedCollection(null)
    }
  }

  if (collections.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <FolderOpen className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No collections found</h3>
        <p className="text-sm text-muted-foreground">Create your first collection to organize products.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Card
            key={collection.id}
            className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => handleEdit(collection)}
          >
            <div className="aspect-video bg-muted relative">
              {collection.image ? (
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(collection)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => confirmDelete(collection)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{collection.title}</h3>
                  {collection.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary">
                  {collection._count.products} products
                </Badge>
                <Badge variant={collection.type === "MANUAL" ? "outline" : "secondary"}>
                  {collection.type.toLowerCase()}
                </Badge>
                {!collection.published && (
                  <Badge variant="outline" className="text-yellow-600">
                    Draft
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{selectedCollection?.title}&quot;. Products in this collection will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCollection && (
        <CollectionForm
          open={editOpen}
          onOpenChange={setEditOpen}
          collection={{
            id: selectedCollection.id,
            title: selectedCollection.title,
            description: selectedCollection.description,
            image: selectedCollection.image,
            published: selectedCollection.published
          }}
        />
      )}
    </>
  )
}
