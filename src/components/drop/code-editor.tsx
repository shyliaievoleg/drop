"use client"

import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"
import { formatBytes, DATOCMS_LIMIT_BYTES } from "@/lib/storage"

interface CodeEditorProps {
  value: string
  onChange: (v: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const bytes = typeof TextEncoder !== "undefined"
    ? new TextEncoder().encode(value).length
    : value.length
  const overLimit = bytes > DATOCMS_LIMIT_BYTES

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder={"<!doctype html>\n<html>\n  <head>\n    <style>…</style>\n  </head>\n  <body>\n    <!-- your interactive block -->\n    <script>…</script>\n  </body>\n</html>"}
          className="drop-code-textarea h-full resize-none overflow-y-scroll rounded-none border-0 bg-zinc-950 font-mono text-[13px] leading-relaxed text-zinc-100 focus-visible:ring-0 dark:bg-zinc-950"
          style={{ tabSize: 2 }}
        />
      </div>
      <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{value.length.toLocaleString("en-US")} chars · {formatBytes(bytes)}</span>
        {overLimit ? (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Exceeds DatoCMS 300KB limit — iframe solves this
          </span>
        ) : (
          <span>HTML/CSS/JS, self-contained</span>
        )}
      </div>
    </div>
  )
}
