"use client"

import { Shield, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ScanResult, RiskLevel } from "@/lib/scanner/types"
import { RISK_CONFIG } from "@/lib/scanner/types"
import { cn } from "@/lib/utils"

interface StatsCardsProps {
  results: ScanResult[]
}

const ICONS: Record<RiskLevel | "TOTAL", React.ComponentType<{ className?: string }>> = {
  TOTAL: Shield,
  CRITICAL: AlertTriangle,
  HIGH: AlertCircle,
  MEDIUM: AlertTriangle,
  INFO: Info,
  LOW: CheckCircle,
}

export function StatsCards({ results }: StatsCardsProps) {
  const counts = {
    TOTAL: results.length,
    CRITICAL: results.filter((r) => r.riskLevel === "CRITICAL").length,
    HIGH: results.filter((r) => r.riskLevel === "HIGH").length,
    MEDIUM: results.filter((r) => r.riskLevel === "MEDIUM").length,
    INFO: results.filter((r) => r.riskLevel === "INFO").length,
    LOW: results.filter((r) => r.riskLevel === "LOW").length,
  }

  const cards: { key: RiskLevel | "TOTAL"; label: string; description: string }[] = [
    { key: "TOTAL", label: "Total Scanned", description: "Subdomains analyzed" },
    { key: "CRITICAL", label: "Critical", description: "Confirmed takeover" },
    { key: "HIGH", label: "High", description: "Dangling pointer" },
    { key: "MEDIUM", label: "Medium", description: "DNS hygiene" },
    { key: "INFO", label: "Info", description: "Needs review" },
    { key: "LOW", label: "Low", description: "NXDOMAIN / Safe" },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map(({ key, label, description }) => {
        const Icon = ICONS[key]
        const config = key === "TOTAL" ? null : RISK_CONFIG[key]
        const count = counts[key]

        return (
          <Card
            key={key}
            className={cn(
              "relative overflow-hidden",
              config && count > 0 && config.borderClass,
              config && count > 0 && "border"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md",
                    key === "TOTAL"
                      ? "bg-primary/10"
                      : count > 0
                      ? config?.bgClass
                      : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      key === "TOTAL"
                        ? "text-primary"
                        : count > 0
                        ? config?.textClass
                        : "text-muted-foreground"
                    )}
                  />
                </div>
              </div>
              <div className="mt-3">
                <p className={cn(
                  "text-2xl font-bold font-mono tracking-tight",
                  key === "TOTAL"
                    ? "text-foreground"
                    : count > 0
                    ? config?.textClass
                    : "text-muted-foreground"
                )}>
                  {count}
                </p>
                <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
