import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, RefreshCw, CheckCircle } from "lucide-react"

async function getCurrencies() {
  return prisma.currency.findMany({
    orderBy: [{ isDefault: "desc" }, { code: "asc" }]
  })
}

export default async function CurrenciesPage() {
  const currencies = await getCurrencies()

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Currencies</h1>
          <p className="text-muted-foreground">
            Manage supported currencies and exchange rates
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Update Rates
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Supported Currencies
          </CardTitle>
          <CardDescription>
            Exchange rates are relative to USD (base currency)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Currency</th>
                <th className="text-left py-3 px-2">Code</th>
                <th className="text-left py-3 px-2">Symbol</th>
                <th className="text-right py-3 px-2">Exchange Rate</th>
                <th className="text-center py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency) => (
                <tr key={currency.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {currency.name}
                      {currency.isDefault && (
                        <Badge variant="default" className="bg-blue-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 font-mono">{currency.code}</td>
                  <td className="py-3 px-2">{currency.symbol}</td>
                  <td className="py-3 px-2 text-right font-mono">
                    {Number(currency.exchangeRate).toFixed(4)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {currency.isActive ? (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Price Display Examples</CardTitle>
          <CardDescription>
            How $100.00 USD displays in each currency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {currencies.filter(c => c.isActive).map((currency) => (
              <div key={currency.id} className="border rounded p-3 text-center">
                <p className="text-lg font-bold">
                  {currency.symbol}{(100 * Number(currency.exchangeRate)).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">{currency.code}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
