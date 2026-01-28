import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Star, Truck, Shield, RefreshCw } from "lucide-react"

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: {
      variants: { take: 1 }
    },
    take: 8,
    orderBy: { createdAt: "desc" }
  })
}

async function getCollections() {
  return prisma.collection.findMany({
    where: { published: true },
    take: 4,
    orderBy: { createdAt: "desc" }
  })
}

async function getCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    take: 6
  })
}

export default async function HomePage() {
  const [products, collections, categories] = await Promise.all([
    getFeaturedProducts(),
    getCollections(),
    getCategories()
  ])

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-6">
              Discover Your Style
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Shop the latest trends in fashion, electronics, and home goods. Quality products at unbeatable prices.
            </p>
            <div className="flex gap-4">
              <Link href="/shop">
                <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/collections">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  View Collections
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Free Shipping</h3>
                <p className="text-sm text-muted-foreground">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Secure Payment</h3>
                <p className="text-sm text-muted-foreground">100% secure checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Easy Returns</h3>
                <p className="text-sm text-muted-foreground">30-day return policy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop/category/${category.slug}`}
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <span className="text-2xl">
                        {category.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Link href="/shop">
              <Button variant="outline">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
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
                      <span className="text-xs text-muted-foreground ml-1">(4.0)</span>
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
        </div>
      </section>

      {/* Collections */}
      {collections.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Shop Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  className="group relative"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                      {collection.image ? (
                        <img
                          src={collection.image}
                          alt={collection.title}
                          className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                          <h3 className="text-xl font-bold">{collection.title}</h3>
                          <p className="text-sm text-gray-300 mt-2">Shop Now</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Newsletter</h2>
          <p className="text-lg mb-8 opacity-90">
            Subscribe to get special offers, free giveaways, and new arrivals.
          </p>
          <form className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg text-gray-900"
            />
            <Button variant="secondary">Subscribe</Button>
          </form>
        </div>
      </section>
    </div>
  )
}
