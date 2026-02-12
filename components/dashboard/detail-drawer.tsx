"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { RiskBadge } from "./risk-badge"
import type { ScanResult } from "@/lib/scanner/types"
import { RISK_CONFIG } from "@/lib/scanner/types"
import { cn } from "@/lib/utils"

interface DetailDrawerProps {
  result: ScanResult | null
  open: boolean
  onClose: () => void
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={cn("text-sm text-foreground break-all", mono && "font-mono text-xs")}>{value || "N/A"}</span>
    </div>
  )
}

function getRemediationGuidance(result: ScanResult): string {
  switch (result.riskLevel) {
    case "CRITICAL":
      return "IMMEDIATE ACTION REQUIRED: This subdomain has a confirmed takeover fingerprint. An attacker can claim the underlying service and serve content on your domain. Remove the DNS record or reclaim the third-party resource immediately."
    case "HIGH":
      return "HIGH PRIORITY: The DNS record points to a third-party service that appears unclaimed or broken. While no takeover fingerprint was confirmed, this is a strong indicator of a dangling pointer. Remove the DNS record or verify the service is properly configured."
    case "MEDIUM":
      return "REVIEW RECOMMENDED: This DNS record appears misconfigured or self-pointing. While the likelihood of exploitation is lower, broken DNS records create hygiene issues and may indicate orphaned infrastructure. Clean up the record or verify it is intentional."
    case "INFO":
      return "INFORMATIONAL: This subdomain appears active. Verify that the service is intentionally configured and that your organization owns the target resource."
    case "LOW":
      return "LOW PRIORITY: This record resolved to NXDOMAIN or a known-safe target. No immediate risk, but consider cleaning up stale DNS entries."
  }
}

function getDnsExplanation(result: ScanResult): string {
  if (result.dnsStatus === "CNAME") {
    const nxdomain = result.dnsLookupResult.includes("[CNAME target NXDOMAIN]")
    if (nxdomain) {
      return `The subdomain has a CNAME record pointing to "${result.cname}", but the CNAME target does not resolve (NXDOMAIN). This is a dangling CNAME.`
    }
    return `The subdomain has a CNAME record pointing to "${result.cname}". The CNAME target resolves successfully.`
  }
  if (result.dnsStatus === "A") {
    return `The subdomain has an A record pointing to IP address ${result.cname}.`
  }
  return "The subdomain has no DNS record (NXDOMAIN). It does not resolve at all."
}

export function DetailDrawer({ result, open, onClose }: DetailDrawerProps) {
  if (!result) return null

  const config = RISK_CONFIG[result.riskLevel]

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <RiskBadge level={result.riskLevel} />
            <span className="text-xs text-muted-foreground">{result.securityIssue}</span>
          </div>
          <SheetTitle className="font-mono text-base break-all text-foreground">{result.subdomain}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Scanned at {new Date(result.scannedAt).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 pb-6">
          {/* DNS Trail */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              DNS Lookup Trail
            </h3>
            <div className={cn("rounded-lg border p-3", config.borderClass, config.bgClass)}>
              <code className="text-xs font-mono text-foreground leading-relaxed block">
                {result.dnsLookupResult}
              </code>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {getDnsExplanation(result)}
            </p>
          </section>

          <Separator />

          {/* Details Grid */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Evidence Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="DNS Status" value={result.dnsStatus} />
              <InfoRow label="HTTP Status" value={result.httpStatus} mono />
              <InfoRow label="Provider" value={result.provider} />
              <InfoRow label="Server" value={result.serverHeader} mono />
              <div className="col-span-2">
                <InfoRow label="CNAME / Pointed To" value={result.cname} mono />
              </div>
              <div className="col-span-2">
                <InfoRow label="Signature" value={result.signature} mono />
              </div>
            </div>
          </section>

          <Separator />

          {/* Risk Classification */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Risk Classification
            </h3>
            <div className={cn("rounded-lg border p-3", config.borderClass, config.bgClass)}>
              <div className="flex items-center gap-2 mb-2">
                <RiskBadge level={result.riskLevel} />
              </div>
              <p className="text-xs text-foreground leading-relaxed">{result.riskLabel}</p>
            </div>
          </section>

          <Separator />

          {/* Remediation */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Remediation Guidance
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getRemediationGuidance(result)}
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
