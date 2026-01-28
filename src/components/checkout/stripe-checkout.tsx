"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface CheckoutFormProps {
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
}

function CheckoutForm({ onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setMessage("")

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`
      },
      redirect: "if_required"
    })

    if (error) {
      setMessage(error.message || "An error occurred")
      onError(error.message || "Payment failed")
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id)
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {message && (
        <div className="text-red-600 text-sm">{message}</div>
      )}
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay Now"
        )}
      </Button>
    </form>
  )
}

interface StripeCheckoutProps {
  cartId: string
  amount: number
  shippingAmount?: number
  taxAmount?: number
  discountAmount?: number
  giftCardAmount?: number
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
}

export default function StripeCheckout({
  cartId,
  amount,
  shippingAmount = 0,
  taxAmount = 0,
  discountAmount = 0,
  giftCardAmount = 0,
  onSuccess,
  onError
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    // Create payment intent when component mounts
    async function createPaymentIntent() {
      try {
        const response = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartId,
            shippingAmount,
            taxAmount,
            discountAmount,
            giftCardAmount
          })
        })

        const data = await response.json()

        if (data.error) {
          setError(data.error)
          onError(data.error)
        } else {
          setClientSecret(data.clientSecret)
        }
      } catch (err: any) {
        setError(err.message)
        onError(err.message)
      }
    }

    createPaymentIntent()
  }, [cartId, shippingAmount, taxAmount, discountAmount, giftCardAmount, onError])

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#0f172a",
        colorBackground: "#ffffff",
        colorText: "#1e293b",
        colorDanger: "#ef4444",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px"
      }
    }
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}
