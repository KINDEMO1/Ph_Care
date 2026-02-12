"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, FileText, X, Fingerprint, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FingerprintsEditor, ProvidersEditor } from "./config-editor-dialog"

interface UploadZoneProps {
  onScan: (formData: FormData) => void
  isScanning: boolean
  progress: { current: number; total: number } | null
}

export function UploadZone({ onScan, isScanning, progress }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState("")
  const [mode, setMode] = useState<"file" | "text">("file")
  const [fingerprintsOpen, setFingerprintsOpen] = useState(false)
  const [providersOpen, setProvidersOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
      setMode("file")
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setMode("file")
    }
  }, [])

  const handleSubmit = useCallback(() => {
    const formData = new FormData()
    if (mode === "file" && selectedFile) {
      formData.append("file", selectedFile)
    } else if (mode === "text" && textInput.trim()) {
      formData.append("text", textInput.trim())
    } else {
      return
    }
    onScan(formData)
  }, [mode, selectedFile, textInput, onScan])

  const canSubmit = mode === "file" ? !!selectedFile : textInput.trim().length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setMode("file")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "file"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Upload File
        </button>
        <button
          onClick={() => setMode("text")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "text"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Paste Text
        </button>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        <button
          onClick={() => setFingerprintsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Fingerprint className="h-3.5 w-3.5" />
          Fingerprints
        </button>
        <button
          onClick={() => setProvidersOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
          Providers
        </button>
      </div>

      {/* Config Editors */}
      <FingerprintsEditor open={fingerprintsOpen} onOpenChange={setFingerprintsOpen} />
      <ProvidersEditor open={providersOpen} onOpenChange={setProvidersOpen} />

      {mode === "file" ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : selectedFile
              ? "border-primary/30 bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload file zone"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.csv,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                }}
                className="ml-2 p-1 rounded hover:bg-muted"
                aria-label="Remove file"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop a .txt or .csv file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                One subdomain per line (max 100)
              </p>
            </>
          )}
        </div>
      ) : (
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={"blog.example.com\nshop.example.com\napp.example.com"}
          className="w-full min-h-[140px] rounded-lg border bg-card p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isScanning}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Scanning{progress ? ` (${progress.current}/${progress.total})` : "..."}
            </span>
          ) : (
            "Start Scan"
          )}
        </Button>
        {isScanning && progress && (
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {progress.current} of {progress.total} subdomains scanned
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
