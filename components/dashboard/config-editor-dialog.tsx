"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Fingerprint,
  Globe,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ── Fingerprints Editor ──────────────────────────────────────────────

interface FingerprintEntry {
  domain: string
  signatures: string[]
}

function FingerprintsEditor({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [entries, setEntries] = useState<FingerprintEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/config?type=fingerprints")
      const text = await res.text()
      let json: { data?: Record<string, string[]>; error?: string }
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error("Server returned invalid response. Check that the API route exists.")
      }
      if (!res.ok) {
        throw new Error(json.error || "Failed to load fingerprints")
      }
      const data = json.data ?? {}
      const parsed = Object.entries(data).map(([domain, signatures]) => ({
        domain,
        signatures: [...signatures],
      }))
      setEntries(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchData()
      setSaved(false)
      setSearch("")
    }
  }, [open, fetchData])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const data: Record<string, string[]> = {}
      for (const entry of entries) {
        const key = entry.domain.trim()
        if (!key) continue
        data[key] = entry.signatures.filter((s) => s.trim() !== "")
      }
      const res = await fetch("/api/config?type=fingerprints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg = "Failed to save"
        try { msg = JSON.parse(text).error || msg } catch {}
        throw new Error(msg)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const updateDomain = (index: number, value: string) => {
    setEntries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], domain: value }
      return next
    })
  }

  const updateSignature = (
    entryIndex: number,
    sigIndex: number,
    value: string
  ) => {
    setEntries((prev) => {
      const next = [...prev]
      const sigs = [...next[entryIndex].signatures]
      sigs[sigIndex] = value
      next[entryIndex] = { ...next[entryIndex], signatures: sigs }
      return next
    })
  }

  const addSignature = (entryIndex: number) => {
    setEntries((prev) => {
      const next = [...prev]
      next[entryIndex] = {
        ...next[entryIndex],
        signatures: [...next[entryIndex].signatures, ""],
      }
      return next
    })
  }

  const removeSignature = (entryIndex: number, sigIndex: number) => {
    setEntries((prev) => {
      const next = [...prev]
      const sigs = next[entryIndex].signatures.filter((_, i) => i !== sigIndex)
      next[entryIndex] = { ...next[entryIndex], signatures: sigs }
      return next
    })
  }

  const addEntry = () => {
    setEntries((prev) => [...prev, { domain: "", signatures: [""] }])
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const filtered = entries
    .map((e, i) => ({ ...e, _idx: i }))
    .filter((e) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        e.domain.toLowerCase().includes(q) ||
        e.signatures.some((s) => s.toLowerCase().includes(q))
      )
    })

  const totalSigs = entries.reduce((sum, e) => sum + e.signatures.length, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Fingerprint className="h-5 w-5 text-primary" />
            Edit Fingerprints
          </DialogTitle>
          <DialogDescription>
            Manage service fingerprint signatures. Each domain maps to response
            body strings matched during HTTP probing to detect takeover
            vulnerabilities. Changes are saved directly to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              fingerprints.ts
            </code>
            .
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-critical/30 bg-critical/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-critical shrink-0" />
            <p className="text-xs text-critical">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search domains or signatures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addEntry}
            className="shrink-0 h-8 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Domain
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Loading fingerprints from file...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm text-muted-foreground">
                {search ? "No matching entries found." : "No fingerprints configured."}
              </p>
              {!search && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addEntry}
                  className="gap-1 text-xs mt-1"
                >
                  <Plus className="h-3 w-3" />
                  Add your first fingerprint
                </Button>
              )}
            </div>
          ) : (
            filtered.map((entry) => {
              const idx = entry._idx
              return (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                      Domain
                    </span>
                    <Input
                      value={entry.domain}
                      onChange={(e) => updateDomain(idx, e.target.value)}
                      placeholder="e.g. s3.amazonaws.com"
                      className="h-7 text-xs font-mono flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEntry(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-critical shrink-0"
                      aria-label={`Remove ${entry.domain}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-1.5 pl-3 border-l-2 border-primary/20 ml-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Signatures ({entry.signatures.length})
                    </span>
                    {entry.signatures.map((sig, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-1.5">
                        <Input
                          value={sig}
                          onChange={(e) =>
                            updateSignature(idx, sIdx, e.target.value)
                          }
                          placeholder="Signature string to match in HTTP response..."
                          className="h-6 text-xs font-mono flex-1"
                        />
                        <button
                          onClick={() => removeSignature(idx, sIdx)}
                          className="p-0.5 text-muted-foreground hover:text-critical shrink-0"
                          aria-label="Remove signature"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSignature(idx)}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add signature
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="flex-row items-center">
          <p className="text-xs text-muted-foreground mr-auto">
            {entries.length} domains &middot; {totalSigs} signatures
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="gap-1.5"
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-3 w-3" />
                Saved to file
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Providers Editor ─────────────────────────────────────────────────

interface ProviderEntry {
  domain: string
  name: string
}

function ProvidersEditor({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [entries, setEntries] = useState<ProviderEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/config?type=providers")
      const text = await res.text()
      let json: { data?: Record<string, string>; error?: string }
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error("Server returned invalid response. Check that the API route exists.")
      }
      if (!res.ok) {
        throw new Error(json.error || "Failed to load providers")
      }
      const data = json.data ?? {}
      const parsed = Object.entries(data).map(([domain, name]) => ({
        domain,
        name,
      }))
      setEntries(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchData()
      setSaved(false)
      setSearch("")
    }
  }, [open, fetchData])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const data: Record<string, string> = {}
      for (const entry of entries) {
        const key = entry.domain.trim()
        const value = entry.name.trim()
        if (!key || !value) continue
        data[key] = value
      }
      const res = await fetch("/api/config?type=providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg = "Failed to save"
        try { msg = JSON.parse(text).error || msg } catch {}
        throw new Error(msg)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const updateField = (
    index: number,
    field: "domain" | "name",
    value: string
  ) => {
    setEntries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addEntry = () => {
    setEntries((prev) => [...prev, { domain: "", name: "" }])
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const filtered = entries
    .map((e, i) => ({ ...e, _idx: i }))
    .filter((e) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        e.domain.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q)
      )
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Globe className="h-5 w-5 text-primary" />
            Edit Providers
          </DialogTitle>
          <DialogDescription>
            Manage the CNAME-suffix to provider-name mapping. This is used to
            identify which third-party service a subdomain points to. Changes
            are saved directly to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              providers.ts
            </code>
            .
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-critical/30 bg-critical/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-critical shrink-0" />
            <p className="text-xs text-critical">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search domains or provider names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addEntry}
            className="shrink-0 h-8 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Provider
          </Button>
        </div>

        {/* Column Headers */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex-1">
            Domain Suffix
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex-1">
            Provider Name
          </span>
          <span className="w-7 shrink-0" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Loading providers from file...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm text-muted-foreground">
                {search ? "No matching entries found." : "No providers configured."}
              </p>
              {!search && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addEntry}
                  className="gap-1 text-xs mt-1"
                >
                  <Plus className="h-3 w-3" />
                  Add your first provider
                </Button>
              )}
            </div>
          ) : (
            filtered.map((entry) => {
              const idx = entry._idx
              return (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={entry.domain}
                    onChange={(e) => updateField(idx, "domain", e.target.value)}
                    placeholder="e.g. s3.amazonaws.com"
                    className="h-7 text-xs font-mono flex-1"
                  />
                  <Input
                    value={entry.name}
                    onChange={(e) => updateField(idx, "name", e.target.value)}
                    placeholder="e.g. AWS S3"
                    className="h-7 text-xs flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeEntry(idx)}
                    className="h-7 w-7 text-muted-foreground hover:text-critical shrink-0"
                    aria-label={`Remove ${entry.domain}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter className="flex-row items-center">
          <p className="text-xs text-muted-foreground mr-auto">
            {entries.length} provider mappings
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="gap-1.5"
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-3 w-3" />
                Saved to file
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Export ────────────────────────────────────────────────────────────

export { FingerprintsEditor, ProvidersEditor }
