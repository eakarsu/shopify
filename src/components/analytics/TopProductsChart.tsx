"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface TopProductsChartProps {
  products: { name: string; sales: number; quantity: number }[]
}

export function TopProductsChart({ products }: TopProductsChartProps) {
  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={products} layout="vertical" margin={{ top: 10, right: 10, left: 100, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={90}
            tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Revenue: {formatCurrency(data.sales)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Units sold: {data.quantity}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar
            dataKey="sales"
            fill="hsl(221.2, 83.2%, 53.3%)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
