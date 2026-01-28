import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Mail, Users, MousePointer, Eye, Plus } from "lucide-react"

async function getCampaigns() {
  return prisma.marketingCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 20
  })
}

async function getStats() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [totalCampaigns, totalSent, totalOpened, totalClicked] = await Promise.all([
    prisma.marketingCampaign.count(),
    prisma.campaignRecipient.count({ where: { sentAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { openedAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { clickedAt: { not: null } } })
  ])

  return {
    totalCampaigns,
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0",
    clickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : "0"
  }
}

export default async function MarketingPage() {
  const [campaigns, stats] = await Promise.all([getCampaigns(), getStats()])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      DRAFT: "secondary",
      SCHEDULED: "outline",
      SENDING: "default",
      SENT: "default"
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Marketing</h1>
        <Link href="/admin/marketing/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No campaigns yet. Create your first campaign!
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Campaign</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Recipients</th>
                  <th className="text-left py-3 px-2">Opens</th>
                  <th className="text-left py-3 px-2">Clicks</th>
                  <th className="text-left py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <Link
                        href={`/admin/marketing/${campaign.id}`}
                        className="font-medium hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    </td>
                    <td className="py-3 px-2">{getStatusBadge(campaign.status)}</td>
                    <td className="py-3 px-2">{campaign.recipientCount}</td>
                    <td className="py-3 px-2">{campaign.openCount}</td>
                    <td className="py-3 px-2">{campaign.clickCount}</td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {campaign.sentAt
                        ? new Date(campaign.sentAt).toLocaleDateString()
                        : new Date(campaign.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
