"use client"

import { Shield } from "lucide-react"

export function DashboardHeader() {
  return (
    <header className="flex items-center gap-3 pb-6 border-b border-border">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
        <Shield className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Take Over, Take Down</h1>
        <p className="text-xs text-muted-foreground">Developed by PhCare</p>
      </div>
    </header>
  )
}
