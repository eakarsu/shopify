import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Package, ArrowRight } from "lucide-react"

interface SuccessPageProps {
  searchParams: { order?: string }
}

async function getOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: true
    }
  })
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  if (!searchParams.order) {
    redirect("/")
  }

  const order = await getOrder(searchParams.order)

  if (!order) {
    redirect("/")
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Thank you for your order!</h1>
        <p className="text-muted-foreground mb-8">
          Order #{order.orderNumber} has been confirmed and will be shipped soon.
        </p>

        <Card className="text-left mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <p className="text-sm text-muted-foreground">
                  {order.customer?.firstName} {order.customer?.lastName}<br />
                  {order.shippingAddress1}<br />
                  {order.shippingAddress2 && <>{order.shippingAddress2}<br /></>}
                  {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}<br />
                  {order.shippingCountry}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Contact Information</h3>
                <p className="text-sm text-muted-foreground">
                  {order.email}<br />
                  {order.phone}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <h3 className="font-semibold mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.title}
                    {item.variantTitle && <span className="text-muted-foreground"> - {item.variantTitle}</span>}
                    <span className="text-muted-foreground"> x{item.quantity}</span>
                  </span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotalPrice)}</span>
              </div>
              {Number(order.totalDiscounts) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.totalDiscounts)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(order.totalShipping)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(order.totalTax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/shop">
            <Button variant="outline">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/account/orders">
            <Button>
              <Package className="mr-2 h-4 w-4" />
              View Order Status
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
