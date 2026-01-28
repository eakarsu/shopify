import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LocationsSettings } from "@/components/settings/LocationsSettings"
import { SettingsForm } from "@/components/settings/SettingsForm"

async function getLocations() {
  return db.location.findMany({
    orderBy: { createdAt: "asc" }
  })
}

async function getStoreSettings() {
  const settings = await db.storeSetting.findMany()
  return settings.reduce((acc, s) => {
    acc[s.key] = s.value
    return acc
  }, {} as Record<string, string>)
}

export default async function SettingsPage() {
  const [locations, settings] = await Promise.all([
    getLocations(),
    getStoreSettings()
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your store settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <SettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="locations">
          <LocationsSettings locations={serialize(locations)} />
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Providers</CardTitle>
              <CardDescription>
                Configure how you accept payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Stripe</p>
                    <p className="text-sm text-muted-foreground">
                      Accept credit cards, Apple Pay, and more
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">PayPal</p>
                    <p className="text-sm text-muted-foreground">
                      Accept PayPal payments
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Manual payments</p>
                    <p className="text-sm text-muted-foreground">
                      Cash on delivery, bank transfer, etc.
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Zones</CardTitle>
              <CardDescription>
                Configure shipping rates for different regions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Domestic</p>
                      <p className="text-sm text-muted-foreground">United States</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Standard Shipping</span>
                      <span>$5.99</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Express Shipping</span>
                      <span>$12.99</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Free shipping over $50</span>
                      <span>$0.00</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">International</p>
                      <p className="text-sm text-muted-foreground">Rest of world</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>International Shipping</span>
                      <span>$19.99</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Add shipping zone</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes">
          <Card>
            <CardHeader>
              <CardTitle>Tax Settings</CardTitle>
              <CardDescription>
                Configure tax collection for your store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Charge taxes on products</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically calculate and charge taxes
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="font-medium">Tax rates</p>
                  <div className="rounded-lg border">
                    <div className="flex items-center justify-between border-b p-3">
                      <span>United States - Default</span>
                      <span className="text-muted-foreground">Automatic</span>
                    </div>
                    <div className="flex items-center justify-between border-b p-3">
                      <span>California</span>
                      <span className="text-muted-foreground">7.25%</span>
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <span>New York</span>
                      <span className="text-muted-foreground">8.0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
