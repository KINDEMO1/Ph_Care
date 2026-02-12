"use client"

import { useState, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { UploadZone } from "@/components/dashboard/upload-zone"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProviderChart } from "@/components/dashboard/provider-chart"
import { RiskDonut } from "@/components/dashboard/risk-donut"
import { EvidenceTable } from "@/components/dashboard/evidence-table"
import { DetailDrawer } from "@/components/dashboard/detail-drawer"
import { ExportActions } from "@/components/dashboard/export-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ScanResult } from "@/lib/scanner/types"

export default function Dashboard() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const handleScan = useCallback(async (formData: FormData) => {
    setIsScanning(true)
    setResults([])
    setProgress(null)
    setSelectedRows(new Set())
    setError(null)

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || "Scan failed")
        setIsScanning(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setError("Failed to read response stream")
        setIsScanning(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            if (msg.type === "init") {
              setProgress({ current: 0, total: msg.total })
            } else if (msg.type === "result") {
              setResults((prev) => [...prev, msg.data])
              setProgress((prev) =>
                prev ? { ...prev, current: msg.index + 1 } : { current: msg.index + 1, total: msg.total }
              )
            } else if (msg.type === "error") {
              setProgress((prev) =>
                prev ? { ...prev, current: msg.index + 1 } : null
              )
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setIsScanning(false)
    }
  }, [])

  const handleSelectRow = useCallback((result: ScanResult) => {
    setSelectedResult(result)
    setDrawerOpen(true)
  }, [])

  const handleToggleRow = useCallback((subdomain: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(subdomain)) next.delete(subdomain)
      else next.add(subdomain)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    setSelectedRows((prev) => {
      if (prev.size === results.length && results.length > 0) {
        return new Set()
      }
      return new Set(results.map((r) => r.subdomain))
    })
  }, [results])

  const hasResults = results.length > 0

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
        <DashboardHeader />

        <div className="mt-6 flex flex-col gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upload Targets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UploadZone onScan={handleScan} isScanning={isScanning} progress={progress} />
              {error && (
                <div className="mt-3 rounded-lg border border-critical/30 bg-critical/10 p-3">
                  <p className="text-xs text-critical">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Dashboard */}
          {hasResults && (
            <>
              {/* Stats Row */}
              <StatsCards results={results} />

              {/* Charts Row */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RiskDonut results={results} />
                <ProviderChart results={results} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <ExportActions results={results} selectedRows={selectedRows} />
              </div>

              {/* Evidence Table */}
              <EvidenceTable
                results={results}
                onSelectRow={handleSelectRow}
                selectedRows={selectedRows}
                onToggleRow={handleToggleRow}
                onToggleAll={handleToggleAll}
              />
            </>
          )}

          {/* Empty State */}
          {!hasResults && !isScanning && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">No scan results yet</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Upload a file with subdomains or paste them directly to begin scanning.
                The scanner will resolve DNS, probe HTTP, and classify risks.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        result={selectedResult}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </main>
  )
}
