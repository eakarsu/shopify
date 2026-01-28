"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createOrder } from "@/lib/actions/orders"
import { formatCurrency } from "@/lib/utils"

interface OrderItem {
  id: string
  productId?: string
  title: string
  variantTitle?: string
  sku?: string
  quantity: number
  price: number
}

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")

  const [shippingAddress, setShippingAddress] = useState({
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US"
  })

  const [items, setItems] = useState<OrderItem[]>([
    { id: crypto.randomUUID(), title: "", quantity: 1, price: 0 }
  ])

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), title: "", quantity: 1, price: 0 }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.08
  const shipping = subtotal > 100 ? 0 : 9.99
  const total = subtotal + tax + shipping

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Email is required")
      return
    }

    if (items.some(item => !item.title || item.price <= 0)) {
      setError("All items must have a title and price")
      return
    }

    setLoading(true)

    try {
      const order = await createOrder({
        email,
        phone: phone || undefined,
        items: items.map(({ id, ...item }) => item),
        shippingAddress: shippingAddress.address1 ? shippingAddress : undefined,
        notes: notes || undefined
      })

      router.push(`/orders/${order.id}`)
    } catch (err) {
      console.error("Failed to create order:", err)
      setError("Failed to create order. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create order</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1 grid gap-4 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <Label>Product name</Label>
                          <Input
                            placeholder="Product title"
                            value={item.title}
                            onChange={(e) => updateItem(item.id, "title", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.price || ""}
                            onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button type="button" variant="outline" className="mt-4" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add item
                </Button>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{subtotal > 100 ? "Free" : formatCurrency(shipping)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <Label>Address</Label>
                    <Input
                      placeholder="Street address"
                      value={shippingAddress.address1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Apartment, suite, etc. (optional)</Label>
                    <Input
                      placeholder="Apt, suite, etc."
                      value={shippingAddress.address2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>City</Label>
                      <Input
                        placeholder="City"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        placeholder="State"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Postal code</Label>
                      <Input
                        placeholder="12345"
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about this order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating order..." : "Create order"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
