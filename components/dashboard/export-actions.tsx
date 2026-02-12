"use client"

import { Download, FileText, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ScanResult } from "@/lib/scanner/types"

interface ExportActionsProps {
  results: ScanResult[]
  selectedRows: Set<string>
}

function generateCsv(results: ScanResult[]): string {
  const headers = [
    "Subdomain",
    "CNAME (Pointed To)",
    "DNS Status",
    "HTTP Status",
    "Provider",
    "Signature",
    "DNS Lookup Result",
    "Security Issue",
    "Risk Level",
    "Risk Label",
    "Server Header",
    "Scanned At",
  ]

  const rows = results.map((r) =>
    [
      r.subdomain,
      r.cname,
      r.dnsStatus,
      r.httpStatus,
      r.provider,
      r.signature,
      r.dnsLookupResult,
      r.securityIssue,
      r.riskLevel,
      r.riskLabel,
      r.serverHeader,
      r.scannedAt,
    ]
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(",")
  )

  return [headers.join(","), ...rows].join("\n")
}

function generateCleanupPlan(results: ScanResult[]): string {
  const lines = [
    "# DNS Cleanup Plan",
    `# Generated: ${new Date().toISOString()}`,
    `# Total findings: ${results.length}`,
    "",
    "Subdomain,Current Record,Provider,Risk Level,Security Issue,Suggested Action",
  ]

  for (const r of results) {
    let action = "Review and verify ownership"
    if (r.riskLevel === "CRITICAL") {
      action = "IMMEDIATE: Remove DNS record or reclaim service"
    } else if (r.riskLevel === "HIGH") {
      action = "Remove dangling DNS record"
    } else if (r.riskLevel === "MEDIUM") {
      action = "Clean up misconfigured DNS record"
    } else if (r.securityIssue.includes("NXDOMAIN")) {
      action = "Consider removing stale record"
    }

    lines.push(
      [r.subdomain, `${r.dnsStatus} -> ${r.cname}`, r.provider, r.riskLevel, r.securityIssue, action]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    )
  }

  return lines.join("\n")
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ExportActions({ results, selectedRows }: ExportActionsProps) {
  const hasSelection = selectedRows.size > 0
  const targetResults = hasSelection
    ? results.filter((r) => selectedRows.has(r.subdomain))
    : results

  const handleExportCsv = () => {
    const csv = generateCsv(targetResults)
    const label = hasSelection ? "selected" : "full"
    downloadFile(csv, `scan_results_${label}_${Date.now()}.csv`, "text/csv")
  }

  const handleExportCleanupPlan = () => {
    const actionable = targetResults.filter((r) =>
      ["CRITICAL", "HIGH", "MEDIUM"].includes(r.riskLevel)
    )
    if (actionable.length === 0) {
      return
    }
    const plan = generateCleanupPlan(actionable)
    downloadFile(plan, `dns_cleanup_plan_${Date.now()}.csv`, "text/csv")
  }

  const actionableCount = targetResults.filter((r) =>
    ["CRITICAL", "HIGH", "MEDIUM"].includes(r.riskLevel)
  ).length

  if (results.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCsv}>
        <Download className="h-3 w-3" />
        {hasSelection ? `Export Selected (${selectedRows.size})` : "Export All CSV"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={handleExportCleanupPlan}
        disabled={actionableCount === 0}
      >
        <ClipboardList className="h-3 w-3" />
        Generate Cleanup Plan
        {actionableCount > 0 && (
          <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical/20 px-1 text-[10px] text-critical">
            {actionableCount}
          </span>
        )}
      </Button>

      {hasSelection && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {selectedRows.size} rows selected
        </span>
      )}
    </div>
  )
}
