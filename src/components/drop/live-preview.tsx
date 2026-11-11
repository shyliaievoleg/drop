"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LivePreviewProps {
  html: string
  /** Sandbox attribute string for the iframe. `allow-scripts` is always required. */
  sandbox?: string
  /** Bump to force a full reload (re-runs scripts, resets animations). */
  reloadToken?: number
}

/**
 * Sandboxed iframe that renders the experiment HTML inline via `srcDoc`.
 * The pane has a fixed height (set on the parent grid); the iframe fills it
 * and scrolls internally if the experiment is taller. The `experiment-height`
 * postMessage contract is still documented in the sample snippet — designers
 * ship it for the production embed on the DatoCMS site, where the iframe is
 * NOT height-constrained and auto-sizes to content.
 */
export function LivePreview({ html, sandbox = "allow-scripts allow-same-origin allow-popups", reloadToken = 0 }: LivePreviewProps) {
  const [debounced, setDebounced] = useState(html)
  const [restartNonce, setRestartNonce] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce html so we don't reload the iframe on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(html), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [html])

  // Iframe is remounted (scripts re-run) whenever the parent reloadToken
  // bumps (e.g. sample loaded / experiment selected) or the user hits Restart.
  const iframeKey = `${reloadToken}-${restartNonce}`

  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Preview (sandboxed iframe)</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setRestartNonce((n) => n + 1)}
          title="Restart scripts"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Restart
        </Button>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <iframe
          key={iframeKey}
          srcDoc={debounced}
          title="experiment preview"
          sandbox={sandbox}
          className="h-full w-full rounded-b-lg border-0 bg-white"
          loading="lazy"
        />
      </CardContent>
    </Card>
  )
}
