export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO" | "LOW"

export interface ScanResult {
  subdomain: string
  cname: string
  dnsStatus: "CNAME" | "A" | "NXDOMAIN"
  httpStatus: string
  provider: string
  signature: string
  dnsLookupResult: string
  securityIssue: string
  riskLevel: RiskLevel
  riskLabel: string
  serverHeader: string
  scannedAt: string
}

export const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgClass: string; textClass: string; borderClass: string; dotClass: string }> = {
  CRITICAL: {
    label: "Critical",
    color: "hsl(0, 72%, 51%)",
    bgClass: "bg-critical/15",
    textClass: "text-critical",
    borderClass: "border-critical/30",
    dotClass: "bg-critical",
  },
  HIGH: {
    label: "High",
    color: "hsl(25, 95%, 53%)",
    bgClass: "bg-high/15",
    textClass: "text-high",
    borderClass: "border-high/30",
    dotClass: "bg-high",
  },
  MEDIUM: {
    label: "Medium",
    color: "hsl(45, 93%, 47%)",
    bgClass: "bg-warning/15",
    textClass: "text-warning",
    borderClass: "border-warning/30",
    dotClass: "bg-warning",
  },
  INFO: {
    label: "Info",
    color: "hsl(199, 89%, 48%)",
    bgClass: "bg-info/15",
    textClass: "text-info",
    borderClass: "border-info/30",
    dotClass: "bg-info",
  },
  LOW: {
    label: "Low",
    color: "hsl(215, 15%, 55%)",
    bgClass: "bg-low/15",
    textClass: "text-low",
    borderClass: "border-low/30",
    dotClass: "bg-low",
  },
}
