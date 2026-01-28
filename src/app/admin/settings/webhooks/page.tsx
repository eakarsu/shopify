import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Webhook, Plus, CheckCircle, XCircle } from "lucide-react"

async function getWebhooks() {
  return prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { logs: true } }
    }
  })
}

export default async function WebhooksPage() {
  const webhooks = await getWebhooks()

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Send real-time notifications to external services
          </p>
        </div>
        <Link href="/admin/settings/webhooks/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Registered Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No webhooks configured. Create one to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{webhook.name}</h3>
                        {webhook.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                        {webhook.failCount >= 5 && (
                          <Badge variant="destructive">
                            {webhook.failCount} failures
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {webhook.url}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {webhook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{webhook._count.logs} deliveries</p>
                      {webhook.lastFiredAt && (
                        <p>
                          Last: {new Date(webhook.lastFiredAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/admin/settings/webhooks/${webhook.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Link href={`/admin/settings/webhooks/${webhook.id}/logs`}>
                      <Button variant="outline" size="sm">View Logs</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Available Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              "order.created",
              "order.paid",
              "order.fulfilled",
              "order.cancelled",
              "order.refunded",
              "product.created",
              "product.updated",
              "product.deleted",
              "customer.created",
              "customer.updated",
              "inventory.updated",
              "checkout.completed",
              "payment.failed"
            ].map((event) => (
              <div key={event} className="border rounded p-2 text-sm">
                {event}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
