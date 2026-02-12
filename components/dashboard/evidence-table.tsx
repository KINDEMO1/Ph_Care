"use client"

import { useState, useMemo, useCallback } from "react"
import { ArrowUpDown, Filter, Search, ChevronDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RiskBadge } from "./risk-badge"
import type { ScanResult, RiskLevel } from "@/lib/scanner/types"
import { RISK_CONFIG } from "@/lib/scanner/types"
import { cn } from "@/lib/utils"

interface EvidenceTableProps {
  results: ScanResult[]
  onSelectRow: (result: ScanResult) => void
  selectedRows: Set<string>
  onToggleRow: (subdomain: string) => void
  onToggleAll: () => void
}

type SortKey = "subdomain" | "riskLevel" | "provider" | "dnsStatus" | "httpStatus" | "securityIssue"
type SortDir = "asc" | "desc"

const RISK_SORT_ORDER: Record<RiskLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  INFO: 3,
  LOW: 4,
}

const RISK_LEVELS: RiskLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "INFO", "LOW"]

const ISSUE_TYPES = [
  "Subdomain Takeover",
  "Dangling DNS Record",
  "DNS Hygiene Misconfiguration",
  "Potential Misconfiguration",
  "None - Active Service",
  "None - NXDOMAIN",
]

export function EvidenceTable({
  results,
  onSelectRow,
  selectedRows,
  onToggleRow,
  onToggleAll,
}: EvidenceTableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("riskLevel")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [riskFilters, setRiskFilters] = useState<Set<RiskLevel>>(new Set())
  const [issueFilters, setIssueFilters] = useState<Set<string>>(new Set())
  const [showRiskFilter, setShowRiskFilter] = useState(false)
  const [showIssueFilter, setShowIssueFilter] = useState(false)

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setSortKey(key)
        setSortDir("asc")
      }
    },
    [sortKey]
  )

  const toggleRiskFilter = useCallback((level: RiskLevel) => {
    setRiskFilters((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }, [])

  const toggleIssueFilter = useCallback((issue: string) => {
    setIssueFilters((prev) => {
      const next = new Set(prev)
      if (next.has(issue)) next.delete(issue)
      else next.add(issue)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    let data = [...results]

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (r) =>
          r.subdomain.toLowerCase().includes(q) ||
          r.cname.toLowerCase().includes(q) ||
          r.provider.toLowerCase().includes(q) ||
          r.securityIssue.toLowerCase().includes(q)
      )
    }

    if (riskFilters.size > 0) {
      data = data.filter((r) => riskFilters.has(r.riskLevel))
    }

    if (issueFilters.size > 0) {
      data = data.filter((r) => issueFilters.has(r.securityIssue))
    }

    data.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "riskLevel":
          cmp = RISK_SORT_ORDER[a.riskLevel] - RISK_SORT_ORDER[b.riskLevel]
          break
        case "subdomain":
          cmp = a.subdomain.localeCompare(b.subdomain)
          break
        case "provider":
          cmp = a.provider.localeCompare(b.provider)
          break
        case "dnsStatus":
          cmp = a.dnsStatus.localeCompare(b.dnsStatus)
          break
        case "httpStatus":
          cmp = a.httpStatus.localeCompare(b.httpStatus)
          break
        case "securityIssue":
          cmp = a.securityIssue.localeCompare(b.securityIssue)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return data
  }, [results, search, riskFilters, issueFilters, sortKey, sortDir])

  const allSelected = filtered.length > 0 && filtered.every((r) => selectedRows.has(r.subdomain))

  const SortHeader = ({ label, sortKeyProp }: { label: string; sortKeyProp: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyProp)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === sortKeyProp ? "text-primary" : "text-muted-foreground/50")} />
    </button>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Chain of Evidence</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subdomains..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 pl-8 text-xs bg-secondary border-border"
              />
            </div>

            {/* Risk Filter */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setShowRiskFilter(!showRiskFilter)
                  setShowIssueFilter(false)
                }}
              >
                <Filter className="h-3 w-3" />
                Risk
                {riskFilters.size > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {riskFilters.size}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showRiskFilter && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border bg-card p-2 shadow-lg">
                  {RISK_LEVELS.map((level) => (
                    <label
                      key={level}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={riskFilters.has(level)}
                        onCheckedChange={() => toggleRiskFilter(level)}
                        className="h-3.5 w-3.5"
                      />
                      <RiskBadge level={level} />
                    </label>
                  ))}
                  {riskFilters.size > 0 && (
                    <button
                      className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                      onClick={() => setRiskFilters(new Set())}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Issue Filter */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setShowIssueFilter(!showIssueFilter)
                  setShowRiskFilter(false)
                }}
              >
                <Filter className="h-3 w-3" />
                Issue
                {issueFilters.size > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {issueFilters.size}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showIssueFilter && (
                <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border bg-card p-2 shadow-lg">
                  {ISSUE_TYPES.map((issue) => (
                    <label
                      key={issue}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={issueFilters.has(issue)}
                        onCheckedChange={() => toggleIssueFilter(issue)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-foreground">{issue}</span>
                    </label>
                  ))}
                  {issueFilters.size > 0 && (
                    <button
                      className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                      onClick={() => setIssueFilters(new Set())}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[520px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                    className="h-3.5 w-3.5"
                    aria-label="Select all rows"
                  />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Subdomain" sortKeyProp="subdomain" />
                </TableHead>
                <TableHead className="text-xs hidden lg:table-cell">CNAME</TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="DNS" sortKeyProp="dnsStatus" />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="HTTP" sortKeyProp="httpStatus" />
                </TableHead>
                <TableHead className="text-xs hidden md:table-cell">
                  <SortHeader label="Provider" sortKeyProp="provider" />
                </TableHead>
                <TableHead className="text-xs hidden xl:table-cell">
                  <SortHeader label="Security Issue" sortKeyProp="securityIssue" />
                </TableHead>
                <TableHead className="text-xs">
                  <SortHeader label="Risk" sortKeyProp="riskLevel" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-sm">
                    {results.length === 0 ? "No scan results yet" : "No results match your filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((result) => (
                  <TableRow
                    key={result.subdomain}
                    className="cursor-pointer border-border hover:bg-muted/50"
                    onClick={() => onSelectRow(result)}
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.has(result.subdomain)}
                        onCheckedChange={() => onToggleRow(result.subdomain)}
                        className="h-3.5 w-3.5"
                        aria-label={`Select ${result.subdomain}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground max-w-[200px] truncate">
                      {result.subdomain}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[180px] truncate hidden lg:table-cell">
                      {result.cname}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono",
                          result.dnsStatus === "NXDOMAIN"
                            ? "bg-critical/10 text-critical"
                            : result.dnsStatus === "CNAME"
                            ? "bg-info/10 text-info"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {result.dnsStatus}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {result.httpStatus}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[120px] truncate">
                      {result.provider}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden xl:table-cell max-w-[160px] truncate">
                      {result.securityIssue}
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={result.riskLevel} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            Showing {filtered.length} of {results.length} results
            {selectedRows.size > 0 && ` | ${selectedRows.size} selected`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
