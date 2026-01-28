import Link from "next/link"
import { Store, Facebook, Twitter, Instagram, Youtube } from "lucide-react"

interface StoreFooterProps {
  categories: { id: string; name: string; slug: string }[]
}

export function StoreFooter({ categories }: StoreFooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 text-white mb-4">
              <Store className="h-8 w-8" />
              <span className="text-xl font-bold">ShopifyClone</span>
            </Link>
            <p className="text-sm mb-4">
              Your one-stop shop for quality products at great prices.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-white font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="hover:text-white">
                  All Products
                </Link>
              </li>
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/shop/category/${category.slug}`}
                    className="hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/pages/shipping-policy" className="hover:text-white">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/pages/return-policy" className="hover:text-white">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href="/pages/faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/pages/size-guide" className="hover:text-white">
                  Size Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/pages/about" className="hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/pages/careers" className="hover:text-white">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/pages/privacy-policy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/pages/terms-of-service" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} ShopifyClone. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
