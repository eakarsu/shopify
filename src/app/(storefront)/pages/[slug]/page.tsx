import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface PageProps {
  params: { slug: string }
}

async function getPage(slug: string) {
  return prisma.page.findUnique({
    where: { slug }
  })
}

export default async function StaticPage({ params }: PageProps) {
  const page = await getPage(params.slug)

  if (!page || !page.isPublished) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">{page.title}</h1>

        <div className="prose prose-lg max-w-none">
          {page.content?.split("\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
