"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Invalid verification link")
      return
    }

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Verification failed")
        }

        setStatus("success")
        setMessage(data.message)
      } catch (err: any) {
        setStatus("error")
        setMessage(err.message)
      }
    }

    verify()
  }, [token])

  return (
    <div className="flex min-h-[600px] items-center justify-center px-4">
      <div className="text-center max-w-md">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-gray-400" />
            <h1 className="mt-4 text-xl font-bold">Verifying your email...</h1>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Email verified!</h1>
            <p className="mt-2 text-gray-600">{message}</p>
            <Link
              href="/account"
              className="mt-6 inline-block rounded-md bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Go to account
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Verification failed</h1>
            <p className="mt-2 text-gray-600">{message}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-md bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
