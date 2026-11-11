"use client"

import { useEffect, useMemo, useState } from "react"
import { Rocket, Copy, Loader2, Sparkles, CheckCircle2, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { CodeEditor } from "./code-editor"
import { LivePreview } from "./live-preview"
import { SandboxFlagsPanel } from "./sandbox-flags"
import {
  DATOCMS_LIMIT_BYTES,
  extractTitle,
  formatBytes,
  isValidSlug,
  slugify,
  getExperimentFull,
  putExperiment,
  buildSandboxString,
  loadSandboxFlags,
  DEFAULT_SANDBOX_FLAGS,
  type ExperimentMeta,
  type SandboxFlags,
  type StorageConfig,
} from "@/lib/storage"

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drop demo</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0b1220; color: #e2e8f0; }
  .wrap { padding: 40px 24px; max-width: 560px; margin: 0 auto; text-align: center; }
  .card {
    padding: 32px; border-radius: 18px;
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
    color: #042f2e; box-shadow: 0 20px 60px -20px rgba(16,185,129,.45);
  }
  h1 { margin: 0 0 8px; font-size: 28px; font-weight: 800; }
  p { margin: 0 0 20px; opacity: .85; }
  button {
    padding: 10px 18px; border: 0; border-radius: 999px;
    background: #042f2e; color: #ecfdf5; font-weight: 600; cursor: pointer;
    transition: transform .12s ease;
  }
  button:hover { transform: translateY(-1px); }
  .count { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 32px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Hello from Drop</h1>
      <p>Self-contained snippet. No external dependencies.</p>
      <div class="count" id="count">0</div>
      <p style="margin-top:12px"><button id="b">Click me</button></p>
    </div>
  </div>
  <script>
    let n = 0;
    const el = document.getElementById('count');
    document.getElementById('b').addEventListener('click', () => {
      n += 1; el.textContent = n;
    });
    const send = () => parent.postMessage({ type: 'experiment-height', h: document.body.scrollHeight }, '*');
    window.addEventListener('load', () => { send(); setTimeout(send, 250); });
    new ResizeObserver(send).observe(document.body);
  </script>
</body>
</html>`

interface ExperimentEditorProps {
  initial: ExperimentMeta | null
  config: StorageConfig
  onPublished: (slug: string, sha: string) => void
}

export function ExperimentEditor({ initial, config, onPublished }: ExperimentEditorProps) {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [html, setHtml] = useState("")
  const [sha, setSha] = useState<string | undefined>(undefined)
  const [reloadToken, setReloadToken] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [result, setResult] = useState<{ publicUrl: string; slug: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sandboxFlags, setSandboxFlags] = useState<SandboxFlags>(DEFAULT_SANDBOX_FLAGS)

  // Load sandbox flags from localStorage once on mount.
  useEffect(() => {
    setSandboxFlags(loadSandboxFlags())
  }, [])

  const sandboxString = buildSandboxString(sandboxFlags)

  // Load full content when an experiment is selected.
  useEffect(() => {
    if (!initial) {
      setTitle("")
      setSlug("")
      setSlugTouched(false)
      setHtml("")
      setSha(undefined)
      setResult(null)
      setError(null)
      setReloadToken((t) => t + 1)
      return
    }
    let cancelled = false
    setLoadingContent(true)
    setError(null)
    setResult(null)
    getExperimentFull(config, initial.slug)
      .then(({ html, sha }) => {
        if (cancelled) return
        setHtml(html)
        setSha(sha)
        setTitle(extractTitle(html, initial.slug))
        setSlug(initial.slug)
        setSlugTouched(true)
        setReloadToken((t) => t + 1)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false)
      })
    return () => {
      cancelled = true
    }
  }, [initial?.slug, config])

  const derivedSlug = useMemo(() => slugify(title), [title])
  const effectiveSlug = slugTouched ? slug : derivedSlug
  const slugValid = isValidSlug(effectiveSlug)
  const bytes = typeof TextEncoder !== "undefined"
    ? new TextEncoder().encode(html).length
    : html.length

  async function handlePublish() {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" })
      return
    }
    if (!slugValid) {
      toast({ title: "Invalid slug", description: "Only lowercase letters, digits and hyphens.", variant: "destructive" })
      return
    }
    if (!html.trim()) {
      toast({ title: "HTML is empty", variant: "destructive" })
      return
    }
    setPublishing(true)
    setError(null)
    setResult(null)
    try {
      const res = await putExperiment(config, effectiveSlug, html, title, sha)
      setSha(res.sha)
      setResult({ publicUrl: res.publicUrl, slug: effectiveSlug })
      toast({
        title: "Published",
        description: `${effectiveSlug} → ${config.provider}`,
      })
      onPublished(effectiveSlug, res.sha)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast({ title: "Publish failed", description: message, variant: "destructive" })
    } finally {
      setPublishing(false)
    }
  }

  const embedSnippet = result?.publicUrl
    ? `<iframe\n  src="${result.publicUrl}"\n  sandbox="${sandboxString}"\n  loading="lazy"\n  title="${result.slug}"\n  style="width:100%;border:0;min-height:420px"\n></iframe>`
    : ""

  const providerLabel = config.provider === "gitlab" ? "GitLab Pages" : "GitHub Pages"

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 p-4">
      {/* Meta row */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="exp-title" className="text-xs">Title</Label>
          <Input
            id="exp-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Animated hero"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="exp-slug" className="text-xs">Slug (URL)</Label>
          <Input
            id="exp-slug"
            value={effectiveSlug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugTouched(true)
            }}
            placeholder="hero-animation"
            className={`font-mono ${!slugValid && effectiveSlug ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {!slugValid && effectiveSlug ? (
            <p className="text-[11px] text-destructive">only a-z, 0-9 and hyphens</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              file: <code className="font-mono">…/{effectiveSlug || "slug"}/index.html</code>
            </p>
          )}
        </div>
        <div className="flex items-end">
          <Badge variant="outline" className="gap-1.5">
            <Rocket className="h-3 w-3" /> {providerLabel}
          </Badge>
        </div>
      </div>

      {/* Editor + preview grid — fixed height so the Publish button stays visible */}
      <div className="grid h-[55vh] min-h-[380px] max-h-[620px] min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Snippet code</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                setHtml(SAMPLE_HTML)
                if (!title) setTitle("Drop demo")
                if (!slugTouched) setSlug("drop-demo")
                setSha(undefined)
                setReloadToken((t) => t + 1)
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Sample
            </Button>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <div className="relative h-full">
              {loadingContent && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80 text-zinc-300">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading from repository…
                </div>
              )}
              <CodeEditor value={html} onChange={setHtml} />
            </div>
          </CardContent>
        </Card>

        <div className="min-h-0 min-w-0">
          <LivePreview html={html} sandbox={sandboxString} reloadToken={reloadToken} />
        </div>
      </div>

      {/* Sandbox flags */}
      <SandboxFlagsPanel flags={sandboxFlags} onChange={setSandboxFlags} />

      {/* Publish bar */}
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="min-w-0 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-mono">{formatBytes(bytes)}</Badge>
            {bytes > DATOCMS_LIMIT_BYTES ? (
              <span className="text-amber-600 dark:text-amber-400">
                &gt; 300KB — won't fit DatoCMS HTML field, works via iframe
              </span>
            ) : (
              <span>within DatoCMS 300KB limit</span>
            )}
          </div>
          <Button onClick={handlePublish} disabled={publishing || loadingContent} className="gap-2">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {publishing ? "Publishing…" : initial ? "Update" : "Publish"}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="min-w-0 border-destructive/40">
          <CardContent className="flex items-start gap-2 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <pre className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="min-w-0 overflow-hidden border-emerald-500/40">
          <CardContent className="min-w-0 space-y-3 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Published</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{result.publicUrl}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={result.publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
              </Button>
            </div>

            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Embed snippet for DatoCMS</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(embedSnippet)
                    toast({ title: "Snippet copied" })
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>
              <Textarea readOnly value={embedSnippet} className="font-mono text-xs" rows={6} />
              <p className="text-[11px] text-muted-foreground">
                Paste this URL into the <code className="font-mono">ExperimentEmbed</code> block in DatoCMS.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
