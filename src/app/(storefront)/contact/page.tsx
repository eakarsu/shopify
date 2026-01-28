"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Clock } from "lucide-react"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true) }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Have questions? We're here to help. Reach out to us anytime.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <Card>
            <CardHeader><CardTitle>Send us a message</CardTitle></CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-semibold text-green-600 mb-2">Thank you!</h3>
                  <p className="text-muted-foreground">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label htmlFor="firstName">First Name</Label><Input id="firstName" required /></div>
                    <div><Label htmlFor="lastName">Last Name</Label><Input id="lastName" required /></div>
                  </div>
                  <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required /></div>
                  <div><Label htmlFor="subject">Subject</Label><Input id="subject" required /></div>
                  <div><Label htmlFor="message">Message</Label><Textarea id="message" rows={5} required /></div>
                  <Button type="submit" className="w-full">Send Message</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardContent className="flex items-center gap-4 p-6"><Mail className="h-8 w-8 text-primary" /><div><h3 className="font-semibold">Email</h3><p className="text-muted-foreground">support@shopifyclone.com</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-6"><Phone className="h-8 w-8 text-primary" /><div><h3 className="font-semibold">Phone</h3><p className="text-muted-foreground">+1 (555) 123-4567</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-6"><MapPin className="h-8 w-8 text-primary" /><div><h3 className="font-semibold">Address</h3><p className="text-muted-foreground">123 Commerce St, San Francisco, CA 94105</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-6"><Clock className="h-8 w-8 text-primary" /><div><h3 className="font-semibold">Business Hours</h3><p className="text-muted-foreground">Mon-Fri: 9AM - 6PM PST</p></div></CardContent></Card>
        </div>
      </div>
    </div>
  )
}
