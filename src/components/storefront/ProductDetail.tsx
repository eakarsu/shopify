"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Star,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  Shield,
  RefreshCw,
  Check
} from "lucide-react"
import { addToCart } from "@/lib/actions/cart"

interface ProductDetailProps {
  product: {
    id: string
    title: string
    slug: string
    description: string | null
    price: number
    compareAtPrice: number | null
    images: string[]
    category: { id: string; name: string; slug: string } | null
    variants: {
      id: string
      title: string
      sku: string | null
      price: number
      compareAtPrice: number | null
      inventoryQuantity: number
      options: any
    }[]
    reviews: {
      id: string
      rating: number
      title: string | null
      content: string | null
      customer: { firstName: string; lastName: string }
      createdAt: string
    }[]
  }
  relatedProducts: {
    id: string
    title: string
    slug: string
    price: any
    images: string[]
  }[]
}

export function ProductDetail({ product, relatedProducts }: ProductDetailProps) {
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  const averageRating = product.reviews.length > 0
    ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
    : 0

  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null

  const inStock = selectedVariant.inventoryQuantity > 0

  const handleAddToCart = async () => {
    setLoading(true)
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      router.refresh()
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm mb-6">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li>
            <Link href="/shop" className="text-muted-foreground hover:text-foreground">
              Shop
            </Link>
          </li>
          {product.category && (
            <>
              <li className="text-muted-foreground">/</li>
              <li>
                <Link
                  href={`/shop/category/${product.category.slug}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li className="text-muted-foreground">/</li>
          <li className="font-medium truncate">{product.title}</li>
        </ol>
      </nav>

      {/* Product Details */}
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
            {product.images[selectedImage] ? (
              <img
                src={product.images[selectedImage]}
                alt={product.title}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
            {discount && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-lg px-3 py-1">
                -{discount}%
              </Badge>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.title} ${index + 1}`}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          {product.category && (
            <Link
              href={`/shop/category/${product.category.slug}`}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="text-3xl font-bold">{product.title}</h1>

          {/* Rating */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.round(averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-muted-foreground">
              {averageRating.toFixed(1)} ({product.reviews.length} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold">
              {formatCurrency(selectedVariant.price)}
            </span>
            {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
              <span className="text-xl text-muted-foreground line-through">
                {formatCurrency(selectedVariant.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Variants */}
          {product.variants.length > 1 && (
            <div>
              <label className="font-medium block mb-2">Options</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant={selectedVariant.id === variant.id ? "default" : "outline"}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.inventoryQuantity === 0}
                  >
                    {variant.title}
                    {variant.inventoryQuantity === 0 && " (Out of stock)"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Stock status */}
          <div className="flex items-center gap-2">
            {inStock ? (
              <>
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">In Stock</span>
                <span className="text-muted-foreground">
                  ({selectedVariant.inventoryQuantity} available)
                </span>
              </>
            ) : (
              <span className="text-red-600 font-medium">Out of Stock</span>
            )}
          </div>

          {/* Quantity & Add to cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.min(selectedVariant.inventoryQuantity, quantity + 1))}
                disabled={quantity >= selectedVariant.inventoryQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="flex-1"
              size="lg"
              onClick={handleAddToCart}
              disabled={!inStock || loading}
            >
              {loading ? (
                "Adding..."
              ) : added ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </>
              )}
            </Button>
            <Button variant="outline" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Free Shipping</p>
              <p className="text-xs text-muted-foreground">On orders $50+</p>
            </div>
            <div className="text-center">
              <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Secure Payment</p>
              <p className="text-xs text-muted-foreground">100% protected</p>
            </div>
            <div className="text-center">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Easy Returns</p>
              <p className="text-xs text-muted-foreground">30-day policy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="mb-16">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews ({product.reviews.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="pt-6">
          <div className="prose max-w-none">
            {product.description || "No description available."}
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="pt-6">
          {product.reviews.length > 0 ? (
            <div className="space-y-6">
              {product.reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {review.customer.firstName} {review.customer.lastName}
                          </span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {review.title && (
                      <h4 className="font-medium mb-2">{review.title}</h4>
                    )}
                    {review.content && (
                      <p className="text-muted-foreground">{review.content}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
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
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm line-clamp-2">
                      {product.title}
                    </h3>
                    <p className="font-bold mt-2">
                      {formatCurrency(product.price)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
