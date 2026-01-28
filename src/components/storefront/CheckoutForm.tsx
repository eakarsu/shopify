"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Lock, Package, CreditCard, Truck } from "lucide-react"
import { createOrder } from "@/lib/actions/checkout"

interface CartItem {
  id: string
  quantity: number
  variant: {
    id: string
    title: string
    sku: string | null
    price: number
    product: {
      id: string
      title: string
      images: string[]
    }
  }
}

interface ShippingRate {
  id: string
  name: string
  price: number
  minOrderAmount: number | null
  maxOrderAmount: number | null
  estimatedDays: string | null
  zone: {
    id: string
    name: string
    countries: string[]
    states: string[]
  }
}

interface TaxRate {
  id: string
  name: string
  rate: number
  country: string
  state: string | null
}

interface Discount {
  id: string
  code: string
  type: string
  value: number
  maxAmount: number | null
}

interface CheckoutFormProps {
  cart: {
    id: string
    discountCode: string | null
    items: CartItem[]
  }
  shippingRates: ShippingRate[]
  taxRates: TaxRate[]
  discount: Discount | null
  customerInfo: { email: string; name: string } | null
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" }
]

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
]

export function CheckoutForm({
  cart,
  shippingRates,
  taxRates,
  discount,
  customerInfo
}: CheckoutFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [giftCardCode, setGiftCardCode] = useState("")
  const [giftCardAmount, setGiftCardAmount] = useState(0)

  const [formData, setFormData] = useState({
    email: customerInfo?.email || "",
    firstName: "",
    lastName: "",
    phone: "",
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingState: "",
    shippingPostalCode: "",
    shippingCountry: "US",
    billingAddress1: "",
    billingCity: "",
    billingState: "",
    billingPostalCode: "",
    billingCountry: "US",
    sameAsBilling: true,
    shippingRateId: "",
    paymentMethod: "card",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    notes: ""
  })

  // Calculate subtotal
  const subtotal = cart.items.reduce((acc, item) => {
    return acc + item.variant.price * item.quantity
  }, 0)

  // Calculate discount
  let discountAmount = 0
  if (discount) {
    if (discount.type === "PERCENTAGE") {
      discountAmount = subtotal * (discount.value / 100)
    } else {
      discountAmount = discount.value
    }
    if (discount.maxAmount && discountAmount > discount.maxAmount) {
      discountAmount = discount.maxAmount
    }
  }

  // Get available shipping rates based on country/state
  const availableShippingRates = shippingRates.filter(rate => {
    const country = formData.shippingCountry
    const state = formData.shippingState

    // Check if zone includes country
    if (!rate.zone.countries.includes(country) && rate.zone.countries.length > 0) {
      return false
    }

    // Check if zone includes state (if specified)
    if (rate.zone.states.length > 0 && !rate.zone.states.includes(state)) {
      return false
    }

    // Check order amount requirements
    const afterDiscount = subtotal - discountAmount
    if (rate.minOrderAmount && afterDiscount < rate.minOrderAmount) {
      return false
    }
    if (rate.maxOrderAmount && afterDiscount > rate.maxOrderAmount) {
      return false
    }

    return true
  })

  // Get selected shipping rate
  const selectedShippingRate = availableShippingRates.find(r => r.id === formData.shippingRateId)
  const shippingCost = selectedShippingRate?.price || 0

  // Calculate tax
  const applicableTaxRate = taxRates.find(rate => {
    if (rate.country !== formData.shippingCountry) return false
    if (rate.state && rate.state !== formData.shippingState) return false
    return true
  })
  const taxRate = applicableTaxRate?.rate || 0
  const taxableAmount = subtotal - discountAmount + shippingCost
  const taxAmount = taxableAmount * (taxRate / 100)

  // Calculate total
  const total = subtotal - discountAmount + shippingCost + taxAmount - giftCardAmount

  // Set default shipping rate when available
  useEffect(() => {
    if (availableShippingRates.length > 0 && !formData.shippingRateId) {
      setFormData(prev => ({ ...prev, shippingRateId: availableShippingRates[0].id }))
    }
  }, [availableShippingRates, formData.shippingRateId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step < 3) {
      setStep(step + 1)
      return
    }

    setLoading(true)
    try {
      const result = await createOrder({
        cartId: cart.id,
        email: formData.email,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        shippingAddress1: formData.shippingAddress1,
        shippingAddress2: formData.shippingAddress2,
        shippingCity: formData.shippingCity,
        shippingState: formData.shippingState,
        shippingPostalCode: formData.shippingPostalCode,
        shippingCountry: formData.shippingCountry,
        billingAddress1: formData.sameAsBilling ? formData.shippingAddress1 : formData.billingAddress1,
        billingCity: formData.sameAsBilling ? formData.shippingCity : formData.billingCity,
        billingState: formData.sameAsBilling ? formData.shippingState : formData.billingState,
        billingPostalCode: formData.sameAsBilling ? formData.shippingPostalCode : formData.billingPostalCode,
        billingCountry: formData.sameAsBilling ? formData.shippingCountry : formData.billingCountry,
        shippingRateId: formData.shippingRateId,
        discountCode: cart.discountCode,
        giftCardCode: giftCardCode || undefined,
        notes: formData.notes
      })

      if (result.success) {
        router.push(`/checkout/success?order=${result.orderId}`)
      } else {
        alert(result.error || "Failed to create order")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("An error occurred during checkout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/cart">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 ${
                    step > s ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <form onSubmit={handleSubmit}>
              {/* Step 1: Contact & Shipping */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Contact & Shipping
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="shippingAddress1">Address</Label>
                      <Input
                        id="shippingAddress1"
                        value={formData.shippingAddress1}
                        onChange={(e) => setFormData({ ...formData, shippingAddress1: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shippingAddress2">Apartment, suite, etc. (optional)</Label>
                      <Input
                        id="shippingAddress2"
                        value={formData.shippingAddress2}
                        onChange={(e) => setFormData({ ...formData, shippingAddress2: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shippingCity">City</Label>
                        <Input
                          id="shippingCity"
                          value={formData.shippingCity}
                          onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shippingCountry">Country</Label>
                        <Select
                          value={formData.shippingCountry}
                          onValueChange={(value) => setFormData({ ...formData, shippingCountry: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shippingState">State</Label>
                        {formData.shippingCountry === "US" ? (
                          <Select
                            value={formData.shippingState}
                            onValueChange={(value) => setFormData({ ...formData, shippingState: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="shippingState"
                            value={formData.shippingState}
                            onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shippingPostalCode">Postal Code</Label>
                        <Input
                          id="shippingPostalCode"
                          value={formData.shippingPostalCode}
                          onChange={(e) => setFormData({ ...formData, shippingPostalCode: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      Continue to Shipping
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Shipping Method */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Shipping Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={formData.shippingRateId}
                      onValueChange={(value) => setFormData({ ...formData, shippingRateId: value })}
                    >
                      {availableShippingRates.map((rate) => (
                        <div
                          key={rate.id}
                          className="flex items-center space-x-3 border rounded-lg p-4"
                        >
                          <RadioGroupItem value={rate.id} id={rate.id} />
                          <Label htmlFor={rate.id} className="flex-1 cursor-pointer">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium">{rate.name}</p>
                                {rate.estimatedDays && (
                                  <p className="text-sm text-muted-foreground">
                                    {rate.estimatedDays}
                                  </p>
                                )}
                              </div>
                              <span className="font-medium">
                                {rate.price === 0 ? "Free" : formatCurrency(rate.price)}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {availableShippingRates.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No shipping options available for your location.
                      </p>
                    )}

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={!formData.shippingRateId}
                      >
                        Continue to Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                      <p className="font-medium text-yellow-800">Demo Mode</p>
                      <p className="text-yellow-700">
                        This is a demo checkout. No real payment will be processed.
                        Click "Place Order" to simulate a successful order.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="4242 4242 4242 4242"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardExpiry">Expiry</Label>
                        <Input
                          id="cardExpiry"
                          placeholder="MM/YY"
                          value={formData.cardExpiry}
                          onChange={(e) => setFormData({ ...formData, cardExpiry: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardCvc">CVC</Label>
                        <Input
                          id="cardCvc"
                          placeholder="123"
                          value={formData.cardCvc}
                          onChange={(e) => setFormData({ ...formData, cardCvc: e.target.value })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="giftCard">Gift Card (optional)</Label>
                      <Input
                        id="giftCard"
                        placeholder="Enter gift card code"
                        value={giftCardCode}
                        onChange={(e) => setGiftCardCode(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Order Notes (optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Special instructions for your order"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(2)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={loading}
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        {loading ? "Processing..." : `Place Order - ${formatCurrency(total)}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {item.variant.product.images[0] ? (
                          <img
                            src={item.variant.product.images[0]}
                            alt={item.variant.product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.variant.product.title}
                        </p>
                        {item.variant.title !== "Default" && (
                          <p className="text-xs text-muted-foreground">
                            {item.variant.title}
                          </p>
                        )}
                        <p className="text-sm">
                          {formatCurrency(item.variant.price)} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(item.variant.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  {discount && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discount.code})</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {selectedShippingRate
                        ? shippingCost === 0
                          ? "Free"
                          : formatCurrency(shippingCost)
                        : "Calculated next"
                      }
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Tax ({taxRate}%)
                      {applicableTaxRate && (
                        <span className="text-muted-foreground ml-1">
                          {applicableTaxRate.name}
                        </span>
                      )}
                    </span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>

                  {giftCardAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Gift Card</span>
                      <span>-{formatCurrency(giftCardAmount)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(Math.max(0, total))}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
