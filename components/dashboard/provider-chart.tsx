"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { ScanResult, RiskLevel } from "@/lib/scanner/types"
import { RISK_CONFIG } from "@/lib/scanner/types"

interface ProviderChartProps {
  results: ScanResult[]
}

const RISK_ORDER: RiskLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "INFO", "LOW"]

export function ProviderChart({ results }: ProviderChartProps) {
  const data = useMemo(() => {
    const providerMap = new Map<string, { provider: string; count: number; riskCounts: Record<RiskLevel, number>; worstRisk: RiskLevel }>()

    for (const r of results) {
      if (r.provider === "Unknown Provider") continue
      const existing = providerMap.get(r.provider)
      if (existing) {
        existing.count++
        existing.riskCounts[r.riskLevel]++
      } else {
        const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, INFO: 0, LOW: 0 }
        riskCounts[r.riskLevel]++
        providerMap.set(r.provider, { provider: r.provider, count: 1, riskCounts, worstRisk: r.riskLevel })
      }
    }

    // Determine worst risk for each provider
    for (const entry of providerMap.values()) {
      for (const risk of RISK_ORDER) {
        if (entry.riskCounts[risk] > 0) {
          entry.worstRisk = risk
          break
        }
      }
    }

    return Array.from(providerMap.values())
      .sort((a, b) => {
        const aIdx = RISK_ORDER.indexOf(a.worstRisk)
        const bIdx = RISK_ORDER.indexOf(b.worstRisk)
        if (aIdx !== bIdx) return aIdx - bIdx
        return b.count - a.count
      })
      .slice(0, 10)
  }, [results])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Provider Exposure</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-sm text-muted-foreground">No third-party providers detected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Provider Exposure Mix</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="provider"
              width={110}
              tick={{ fontSize: 11, fill: "hsl(210, 20%, 85%)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 9%)",
                border: "1px solid hsl(220, 16%, 16%)",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(210, 20%, 95%)",
              }}
              formatter={(value: number, _name: string, props: { payload: typeof data[0] }) => {
                const entry = props.payload
                const details = RISK_ORDER
                  .filter((r) => entry.riskCounts[r] > 0)
                  .map((r) => `${r}: ${entry.riskCounts[r]}`)
                  .join(", ")
                return [`${value} findings (${details})`, "Count"]
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((entry, index) => (
                <Cell key={index} fill={RISK_CONFIG[entry.worstRisk].color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
