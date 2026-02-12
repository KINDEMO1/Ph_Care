"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import type { ScanResult, RiskLevel } from "@/lib/scanner/types"
import { RISK_CONFIG } from "@/lib/scanner/types"

interface RiskDonutProps {
  results: ScanResult[]
}

const RISK_ORDER: RiskLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "INFO", "LOW"]

export function RiskDonut({ results }: RiskDonutProps) {
  const data = useMemo(() => {
    const counts: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, INFO: 0, LOW: 0 }
    for (const r of results) {
      counts[r.riskLevel]++
    }
    return RISK_ORDER
      .filter((level) => counts[level] > 0)
      .map((level) => ({
        name: RISK_CONFIG[level].label,
        value: counts[level],
        color: RISK_CONFIG[level].color,
        level,
      }))
  }, [results])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  stroke="hsl(220, 18%, 9%)"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 18%, 9%)",
                    border: "1px solid hsl(220, 16%, 16%)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(210, 20%, 95%)",
                  }}
                  formatter={(value: number) => [`${value} findings`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2">
            {data.map((entry) => (
              <div key={entry.level} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}</span>
                <span className="font-mono font-semibold text-foreground">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
