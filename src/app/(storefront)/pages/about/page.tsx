import { Card, CardContent } from "@/components/ui/card"
import { Users, Award, Globe, Heart } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">About Us</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We're passionate about bringing you the best products at great prices.
        </p>
      </div>
      <div className="prose max-w-none mb-12">
        <p className="text-lg text-muted-foreground mb-6">
          Founded in 2024, ShopifyClone has grown from a small startup to a trusted destination for quality products. 
          We believe everyone deserves access to great products without breaking the bank.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><CardContent className="p-6 text-center"><Users className="h-12 w-12 mx-auto mb-4 text-primary" /><h3 className="font-semibold mb-2">10K+ Customers</h3><p className="text-sm text-muted-foreground">Happy customers worldwide</p></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><Award className="h-12 w-12 mx-auto mb-4 text-primary" /><h3 className="font-semibold mb-2">Quality First</h3><p className="text-sm text-muted-foreground">Premium products only</p></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><Globe className="h-12 w-12 mx-auto mb-4 text-primary" /><h3 className="font-semibold mb-2">Global Shipping</h3><p className="text-sm text-muted-foreground">We ship everywhere</p></CardContent></Card>
        <Card><CardContent className="p-6 text-center"><Heart className="h-12 w-12 mx-auto mb-4 text-primary" /><h3 className="font-semibold mb-2">Customer Love</h3><p className="text-sm text-muted-foreground">4.9/5 average rating</p></CardContent></Card>
      </div>
    </div>
  )
}
