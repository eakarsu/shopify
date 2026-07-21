import { prisma } from "@/lib/prisma"
import { StoreHeader } from "@/components/storefront/StoreHeader"
import { StoreFooter } from "@/components/storefront/StoreFooter"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"

async function getCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" }
  })
}

async function getCartItemCount() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const cartId = cookieStore.get("cartId")?.value

  if (session && (session.user as any)?.customerId) {
    const cart = await prisma.cart.findFirst({
      where: { customerAccount: { customerId: (session.user as any).customerId } },
      include: { _count: { select: { items: true } } }
    })
    return cart?._count.items || 0
  } else if (cartId) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { _count: { select: { items: true } } }
    })
    return cart?._count.items || 0
  }

  return 0
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [categories, cartItemCount] = await Promise.all([
    getCategories(),
    getCartItemCount()
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader categories={categories} cartItemCount={cartItemCount} />
      <main className="flex-1">
        {children}
      </main>
      <StoreFooter categories={categories} />
    </div>
  )
}
