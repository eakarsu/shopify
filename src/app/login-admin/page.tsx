"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Store, Loader2 } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("admin-login", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard"
      })

      console.log("SignIn result:", result)

      if (result?.error) {
        setError("Invalid email or password")
      } else if (result?.ok) {
        // Use hard navigation to ensure session is properly loaded
        window.location.href = "/dashboard"
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = async () => {
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/auth/demo-credentials", { cache: "no-store" })
      const credentials = await response.json()
      if (!response.ok) throw new Error(credentials.error || "Demo credentials are unavailable")
      const demoEmail = credentials.email || ""
      const demoPassword = credentials.password || ""
      if (!demoEmail || !demoPassword) throw new Error("Demo credentials are unavailable")
      // Fill the fields, then sign in immediately with the freshly fetched values.
      setEmail(demoEmail)
      setPassword(demoPassword)
      const result = await signIn("admin-login", {
        email: demoEmail,
        password: demoPassword,
        redirect: false,
        callbackUrl: "/dashboard",
      })
      console.log("Demo signIn result:", result)
      if (result?.error) {
        setError("Invalid email or password")
      } else if (result?.ok) {
        // Use hard navigation to ensure session is properly loaded
        window.location.href = "/dashboard"
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo credentials are unavailable")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Dashboard Login</CardTitle>
          <CardDescription>
            Sign in to access your store admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={fillDemoCredentials} disabled={loading}>
              {loading ? "Signing in..." : "Auto Fill & Sign In (Demo)"}
            </Button>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
