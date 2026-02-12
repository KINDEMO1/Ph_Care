import { FINGERPRINTS } from "./fingerprints"
import { PROVIDER_MAP } from "./providers"

export interface ScanResult {
  subdomain: string
  cname: string
  dnsStatus: "CNAME" | "A" | "NXDOMAIN"
  httpStatus: string
  provider: string
  signature: string
  dnsLookupResult: string
  securityIssue: string
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO" | "LOW"
  riskLabel: string
  serverHeader: string
  scannedAt: string
}

function identifyProvider(cnameTarget: string): string {
  const lower = cnameTarget.toLowerCase()
  for (const [domain, provider] of Object.entries(PROVIDER_MAP)) {
    if (lower.includes(domain)) return provider
  }
  return "Unknown Provider"
}

function checkFingerprint(cnameTarget: string, responseBody: string): { isVulnerable: boolean; matchedSignature: string } {
  const lower = cnameTarget.toLowerCase()

  for (const [providerDomain, signatures] of Object.entries(FINGERPRINTS)) {
    if (lower.includes(providerDomain)) {
      for (const sig of signatures) {
        if (responseBody.includes(sig)) {
          return { isVulnerable: true, matchedSignature: sig }
        }
      }
      return { isVulnerable: false, matchedSignature: "Service protected or active" }
    }
  }

  // Fallback: scan ALL signatures
  for (const [providerDomain, signatures] of Object.entries(FINGERPRINTS)) {
    for (const sig of signatures) {
      if (responseBody.includes(sig)) {
        const provider = PROVIDER_MAP[providerDomain] || providerDomain
        return { isVulnerable: true, matchedSignature: `${sig} (matched ${provider})` }
      }
    }
  }

  return { isVulnerable: false, matchedSignature: "No known signature" }
}

function classifyRisk(
  dnsStatus: string,
  httpStatus: number,
  fingerprint: string,
  httpError: string,
  provider: string,
  cnameTarget: string
): { riskLevel: ScanResult["riskLevel"]; riskLabel: string } {
  const cleanCname = cnameTarget.toLowerCase().replace(/\.$/, "")

  if (["google.com", "www.google.com", "maps.google.com"].includes(cleanCname)) {
    return { riskLevel: "LOW", riskLabel: "Pointed to Google Main (Safe/Not Exploitable)" }
  }
  if (provider === "Unknown Provider" && cleanCname.includes("google.com")) {
    return { riskLevel: "LOW", riskLabel: "Pointed to Generic Google (Safe)" }
  }

  const isThirdParty = provider !== "Unknown Provider"
  const isBroken = httpStatus === 0 || httpStatus >= 400
  const hasFingerprint = !["", "No known signature", "Service protected or active"].includes(fingerprint)

  if (dnsStatus === "CNAME" && isBroken && !isThirdParty) {
    return { riskLevel: "MEDIUM", riskLabel: "DNS Hygiene: Self-Pointing or Misconfigured CNAME (Low Likelihood, Some Potential)" }
  }
  if (dnsStatus === "A" && isBroken && !isThirdParty) {
    return { riskLevel: "MEDIUM", riskLabel: "DNS Hygiene: Misconfigured/Dead A Record (Low Likelihood, Some Potential)" }
  }
  if (isThirdParty && isBroken && hasFingerprint) {
    return { riskLevel: "CRITICAL", riskLabel: "Confirmed Subdomain Takeover (All 3 Conditions Met)" }
  }
  if (isThirdParty && httpStatus === 200 && hasFingerprint) {
    return { riskLevel: "CRITICAL", riskLabel: "Subdomain Takeover (Service Responding 200 with Fingerprint)" }
  }
  if (isThirdParty && isBroken) {
    return { riskLevel: "HIGH", riskLabel: "Dangling Pointer to 3rd Party (No Fingerprint)" }
  }
  if (!isThirdParty && hasFingerprint && isBroken) {
    return { riskLevel: "HIGH", riskLabel: "Suspicious Content (Fingerprint Found but Provider Unknown)" }
  }
  if (dnsStatus === "NXDOMAIN") {
    return { riskLevel: "LOW", riskLabel: "No DNS Record - Not Exploitable" }
  }
  if ((dnsStatus === "CNAME" || dnsStatus === "A") && httpStatus === 200) {
    return { riskLevel: "INFO", riskLabel: "Active Subdomain - Verify Ownership" }
  }

  return { riskLevel: "INFO", riskLabel: "Orphaned or Misconfigured Subdomain" }
}

function determineSecurityIssue(
  dnsStatus: string,
  httpStatus: number,
  fingerprint: string,
  riskLevel: string
): string {
  const hasPointer = dnsStatus === "CNAME" || dnsStatus === "A"
  const isVulnerableFp = !["", "No known signature", "Service protected or active"].includes(fingerprint)

  if (riskLevel === "CRITICAL") return "Subdomain Takeover"
  if (riskLevel === "HIGH") return "Dangling DNS Record"
  if (riskLevel === "MEDIUM") return "DNS Hygiene Misconfiguration"
  if (hasPointer && httpStatus === 200 && !isVulnerableFp) return "None - Active Service"
  if (dnsStatus === "NXDOMAIN") return "None - NXDOMAIN"
  if (hasPointer && (httpStatus >= 400 || httpStatus === 0)) return "Potential Misconfiguration"

  return "Potential Misconfiguration"
}

async function dnsLookup(subdomain: string): Promise<{ dnsStatus: "CNAME" | "A" | "NXDOMAIN"; cnameTarget: string; dnsLookupText: string }> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(subdomain)}&type=CNAME`, {
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()

    if (data.Answer) {
      const cnameRecord = data.Answer.find((a: { type: number }) => a.type === 5)
      if (cnameRecord) {
        const cname = cnameRecord.data.replace(/\.$/, "")
        // Check if CNAME target resolves
        let cnameResolves = true
        try {
          const aRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(cname)}&type=A`, {
            signal: AbortSignal.timeout(5000),
          })
          const aData = await aRes.json()
          if (aData.Status === 3) cnameResolves = false
        } catch {
          cnameResolves = false
        }
        const note = cnameResolves ? "" : " [CNAME target NXDOMAIN]"
        return { dnsStatus: "CNAME", cnameTarget: cname, dnsLookupText: `CNAME -> ${cname}${note}` }
      }
    }

    // Try A record
    const aRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(subdomain)}&type=A`, {
      signal: AbortSignal.timeout(8000),
    })
    const aData = await aRes.json()

    if (aData.Status === 3) {
      return { dnsStatus: "NXDOMAIN", cnameTarget: "", dnsLookupText: "NXDOMAIN" }
    }

    if (aData.Answer) {
      const aRecords = aData.Answer.filter((a: { type: number }) => a.type === 1)
      if (aRecords.length > 0) {
        const ips = aRecords.map((a: { data: string }) => a.data)
        return { dnsStatus: "A", cnameTarget: ips[0], dnsLookupText: `A -> ${ips.join(", ")}` }
      }

      // Check for CNAME in A query response
      const cnameInA = aData.Answer.find((a: { type: number }) => a.type === 5)
      if (cnameInA) {
        const cname = cnameInA.data.replace(/\.$/, "")
        return { dnsStatus: "CNAME", cnameTarget: cname, dnsLookupText: `CNAME -> ${cname}` }
      }
    }

    if (aData.Status === 0 && !aData.Answer) {
      return { dnsStatus: "NXDOMAIN", cnameTarget: "", dnsLookupText: "No DNS Answer" }
    }

    return { dnsStatus: "NXDOMAIN", cnameTarget: "", dnsLookupText: `DNS Status: ${aData.Status}` }
  } catch (err) {
    return { dnsStatus: "NXDOMAIN", cnameTarget: "", dnsLookupText: `DNS Error: ${err instanceof Error ? err.message : "Unknown"}` }
  }
}

async function httpProbe(subdomain: string): Promise<{ status: number; body: string; error: string; serverHeader: string }> {
  const result = { status: 0, body: "", error: "", serverHeader: "" }

  for (const scheme of ["https", "http"]) {
    const url = `${scheme}://${subdomain}`
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const resp = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
      })
      clearTimeout(timeout)

      result.status = resp.status
      const text = await resp.text()
      result.body = text.slice(0, 50000)
      result.serverHeader = resp.headers.get("server") || ""
      result.error = ""
      return result
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          result.error = "Timeout"
          return result
        }
        result.error = scheme === "http" ? "Connection Failed" : ""
      }
      if (scheme === "http") return result
    }
  }

  if (!result.error) result.error = "Connection Failed"
  return result
}

export async function scanSubdomain(subdomain: string): Promise<ScanResult> {
  const { dnsStatus, cnameTarget, dnsLookupText } = await dnsLookup(subdomain)
  const effectiveCname = cnameTarget || subdomain

  const probe = await httpProbe(subdomain)
  const httpStatusNum = probe.status

  const provider = identifyProvider(effectiveCname)
  const { isVulnerable, matchedSignature: fingerprint } = checkFingerprint(effectiveCname, probe.body)

  const { riskLevel, riskLabel } = classifyRisk(dnsStatus, httpStatusNum, fingerprint, probe.error, provider, effectiveCname)
  const securityIssue = determineSecurityIssue(dnsStatus, httpStatusNum, fingerprint, riskLevel)

  let signature: string
  if (isVulnerable && fingerprint) {
    signature = `${provider} - ${fingerprint}`
  } else if (probe.error && httpStatusNum === 0) {
    signature = `${provider} - ${probe.error}`
  } else if (httpStatusNum > 0) {
    signature = `${provider} - HTTP ${httpStatusNum}`
  } else {
    signature = `${provider} - No Response`
  }

  const httpDisplay = httpStatusNum === 0
    ? `0 (${probe.error || "No Response"})`
    : String(httpStatusNum)

  return {
    subdomain,
    cname: effectiveCname,
    dnsStatus,
    httpStatus: httpDisplay,
    provider,
    signature,
    dnsLookupResult: dnsLookupText,
    securityIssue,
    riskLevel,
    riskLabel,
    serverHeader: probe.serverHeader,
    scannedAt: new Date().toISOString(),
  }
}

export function parseDomainsFromText(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const domains: string[] = []
  const firstLine = lines[0]?.toLowerCase() || ""
  const skipHeader = firstLine.includes("subdomain") || firstLine.includes("domain")

  for (let i = 0; i < lines.length; i++) {
    if (i === 0 && skipHeader) continue
    // Handle CSV: take first column
    const parts = lines[i].split(",")
    let val = (parts[0] || "").trim()
    // Strip quotes
    val = val.replace(/^["']|["']$/g, "")
    // Strip protocol
    val = val.replace(/^https?:\/\//, "").replace(/\/$/, "")
    if (val && val.includes(".")) {
      domains.push(val)
    }
  }

  return [...new Set(domains)]
}
