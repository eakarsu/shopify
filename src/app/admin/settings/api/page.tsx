import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Key, Plus, Shield, Clock } from "lucide-react"

async function getApiKeys() {
  return prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" }
  })
}

export default async function ApiKeysPage() {
  const apiKeys = await getApiKeys()

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API access to your store
          </p>
        </div>
        <Link href="/admin/settings/api/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            API Documentation
          </CardTitle>
          <CardDescription>
            Use these endpoints to integrate with your store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Base URL</h4>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_SITE_URL || "https://yourstore.com"}/api/v1
              </code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Available Endpoints</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="border rounded p-2">
                  <span className="font-mono text-green-600">GET</span> /products
                </div>
                <div className="border rounded p-2">
                  <span className="font-mono text-blue-600">POST</span> /products
                </div>
                <div className="border rounded p-2">
                  <span className="font-mono text-green-600">GET</span> /orders
                </div>
                <div className="border rounded p-2">
                  <span className="font-mono text-blue-600">POST</span> /orders
                </div>
                <div className="border rounded p-2">
                  <span className="font-mono text-green-600">GET</span> /customers
                </div>
                <div className="border rounded p-2">
                  <span className="font-mono text-blue-600">POST</span> /customers
                </div>
                <div className="border rounded p-2">
                  <span className="font-mono text-green-600">GET</span> /inventory
                </div>
                <div className="border rounded p-2">
                  <span className="font-mono text-blue-600">POST</span> /inventory/adjust
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys created. Create one to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{apiKey.name}</h3>
                        {apiKey.isActive ? (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-mono">
                        {apiKey.key.substring(0, 20)}...
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {apiKey.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apiKey.lastUsedAt
                          ? `Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`
                          : "Never used"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
