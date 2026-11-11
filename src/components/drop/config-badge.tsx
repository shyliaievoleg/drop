"use client"

import { CheckCircle2, AlertTriangle, CloudOff, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { StorageConfig } from "@/lib/storage"

const LABELS = { github: "GitHub Pages", gitlab: "GitLab Pages" } as const

export function ConfigBadge({
  config,
  onOpenSettings,
}: {
  config: StorageConfig | null
  onOpenSettings: () => void
}) {
  const configured = config && (
    config.provider === "github"
      ? config.github.token && config.github.owner && config.github.repo
      : config.gitlab.token && config.gitlab.projectId
  )

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onOpenSettings}
            className="focus:outline-none"
            aria-label="Connection settings"
          >
            <Badge
              variant="secondary"
              className={`gap-1.5 ${
                configured
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {configured ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {configured ? LABELS[config!.provider] : "Not configured"}
              <Settings2 className="h-3 w-3 opacity-60" />
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs leading-relaxed">
            {configured
              ? `Active provider: ${LABELS[config!.provider]}. Click to change.`
              : "Click to configure GitHub/GitLab connection."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
