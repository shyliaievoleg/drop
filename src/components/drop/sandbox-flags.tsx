"use client"

import { ChevronDown, Shield, ShieldAlert } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SANDBOX_FLAG_META,
  buildSandboxString,
  countActiveFlags,
  saveSandboxFlags,
  type SandboxFlags,
} from "@/lib/storage"

interface SandboxFlagsPanelProps {
  flags: SandboxFlags
  onChange: (flags: SandboxFlags) => void
}

export function SandboxFlagsPanel({ flags, onChange }: SandboxFlagsPanelProps) {
  const activeCount = countActiveFlags(flags)
  const sandboxString = buildSandboxString(flags)

  function toggle(key: keyof SandboxFlags, value: boolean) {
    const next = { ...flags, [key]: value }
    onChange(next)
    saveSandboxFlags(next)
  }

  return (
    <Collapsible className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/30">
        <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sandbox iframe</span>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
              allow-scripts +{activeCount}
            </Badge>
          </div>
          <code className="block truncate font-mono text-[11px] text-muted-foreground">
            {sandboxString}
          </code>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t p-3">
          <p className="mb-3 text-[11px] text-muted-foreground">
            <code className="font-mono">allow-scripts</code> is always on.
            Flags apply to the live preview and the embed snippet for DatoCMS.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SANDBOX_FLAG_META.map((meta) => {
              const checked = flags[meta.key]
              return (
                <div
                  key={meta.key}
                  className={`flex items-start gap-2 rounded-md border p-2 ${
                    meta.risky && checked ? "border-amber-500/50 bg-amber-500/5" : ""
                  }`}
                >
                  {meta.risky && <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`sf-${meta.key}`} className="cursor-pointer text-xs font-medium">
                        {meta.label}
                      </Label>
                      <Switch
                        id={`sf-${meta.key}`}
                        checked={checked}
                        onCheckedChange={(v) => toggle(meta.key, v)}
                        className="scale-90"
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                      {meta.hint}
                    </p>
                    {meta.risky && checked && (
                      <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                        Risky: may affect the host site
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
