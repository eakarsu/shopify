"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface CustomerChartProps {
  data: { date: string; customers: number }[]
}

export function CustomerChart({ data }: CustomerChartProps) {
  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value)
              return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">
                      {new Date(label).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                    <p className="text-sm font-medium">
                      {payload[0].value} new customers
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar
            dataKey="customers"
            fill="hsl(142.1, 76.2%, 36.3%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
