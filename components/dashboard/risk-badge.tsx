"use client"

import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/lib/scanner/types"
import { RISK_CONFIG } from "@/lib/scanner/types"

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = RISK_CONFIG[level]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold border",
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  )
}
