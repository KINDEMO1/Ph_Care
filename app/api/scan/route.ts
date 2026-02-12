import { NextRequest, NextResponse } from "next/server"
import { FINGERPRINTS } from "@/lib/scanner/fingerprints"
import { PROVIDER_MAP } from "@/lib/scanner/providers"
import { promises as fs } from "fs"
import path from "path"

// Resolve absolute paths to the TS source files
function resolveFile(name: string) {
  return path.join(process.cwd(), "lib", "scanner", name)
}

// ---------------------------------------------------------------------------
// Generators: produce clean, valid TS source
// ---------------------------------------------------------------------------

function generateFingerprintTs(data: Record<string, string[]>): string {
  const lines = ["export const FINGERPRINTS: Record<string, string[]> = {"]
  for (const [key, values] of Object.entries(data)) {
    const escaped = values.map(
      (v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    )
    lines.push(`  "${key}": [${escaped.join(", ")}],`)
  }
  lines.push("}\n")
  return lines.join("\n")
}

function generateProviderTs(data: Record<string, string>): string {
  const lines = ["export const PROVIDER_MAP: Record<string, string> = {"]
  for (const [key, value] of Object.entries(data)) {
    lines.push(
      `  "${key}": "${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`
    )
  }
  lines.push("}\n")
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// GET  /api/config?type=fingerprints|providers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type")

    if (type === "fingerprints") {
      return NextResponse.json({ data: FINGERPRINTS })
    }

    if (type === "providers") {
      return NextResponse.json({ data: PROVIDER_MAP })
    }

    return NextResponse.json(
      { error: 'Invalid type. Use ?type=fingerprints or ?type=providers' },
      { status: 400 }
    )
  } catch (err) {
    console.error("[v0] Config GET error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read config" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PUT  /api/config?type=fingerprints|providers
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type")
    const body = await request.json()
    const { data } = body

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }

    if (type === "fingerprints") {
      const tsContent = generateFingerprintTs(data as Record<string, string[]>)
      await fs.writeFile(resolveFile("fingerprints.ts"), tsContent, "utf-8")
      return NextResponse.json({
        success: true,
        entries: Object.keys(data).length,
      })
    }

    if (type === "providers") {
      const tsContent = generateProviderTs(data as Record<string, string>)
      await fs.writeFile(resolveFile("providers.ts"), tsContent, "utf-8")
      return NextResponse.json({
        success: true,
        entries: Object.keys(data).length,
      })
    }

    return NextResponse.json(
      { error: 'Invalid type. Use ?type=fingerprints or ?type=providers' },
      { status: 400 }
    )
  } catch (err) {
    console.error("[v0] Config PUT error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save config" },
      { status: 500 }
    )
  }
}
