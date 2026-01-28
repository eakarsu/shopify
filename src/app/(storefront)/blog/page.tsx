import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, ArrowRight } from "lucide-react"

const blogPosts = [
  {
    id: "1",
    title: "Summer Fashion Trends 2024",
    excerpt: "Discover the hottest fashion trends this summer. From bold colors to sustainable fabrics.",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
    category: "Fashion",
    author: "Sarah Johnson",
    date: "2024-06-15",
    slug: "summer-fashion-trends-2024"
  },
  {
    id: "2",
    title: "How to Style Your Home Office",
    excerpt: "Working from home? Here are the best tips to create a productive and stylish workspace.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    category: "Home",
    author: "Michael Chen",
    date: "2024-06-10",
    slug: "style-home-office"
  },
  {
    id: "3",
    title: "Essential Accessories for Every Wardrobe",
    excerpt: "From watches to bags, these are the must-have accessories that will elevate any outfit.",
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80",
    category: "Accessories",
    author: "Emily Davis",
    date: "2024-06-05",
    slug: "essential-accessories"
  },
  {
    id: "4",
    title: "Sustainable Shopping Guide",
    excerpt: "Learn how to make more eco-conscious shopping decisions without compromising on style.",
    image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80",
    category: "Lifestyle",
    author: "Alex Thompson",
    date: "2024-05-28",
    slug: "sustainable-shopping-guide"
  }
]

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Our Blog</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover the latest trends, tips, and inspiration for your lifestyle.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogPosts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group">
            <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                <Badge className="absolute top-4 left-4">{post.category}</Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {post.author}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.date).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
