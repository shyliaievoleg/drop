"use client"

import { useEffect, useState } from "react"
import { Settings2, Loader2, CheckCircle2, AlertCircle, KeyRound, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  clearConfig,
  testConnection,
  type StorageConfig,
} from "@/lib/storage"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (cfg: StorageConfig) => void
}

export function SettingsDialog({ open, onOpenChange, onSaved }: SettingsDialogProps) {
  const [draft, setDraft] = useState<StorageConfig>(DEFAULT_CONFIG)
  const [provider, setProvider] = useState<"github" | "gitlab">("github")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; label?: string; error?: string } | null>(null)

  useEffect(() => {
    if (open) {
      const saved = loadConfig() ?? DEFAULT_CONFIG
      setDraft(saved)
      setProvider(saved.provider)
      setTestResult(null)
    }
  }, [open])

  function patch<K extends keyof StorageConfig>(key: K, value: StorageConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setTestResult(null)
  }

  function patchGithub(field: keyof StorageConfig["github"], value: string) {
    setDraft((d) => ({ ...d, github: { ...d.github, [field]: value } }))
    setTestResult(null)
  }

  function patchGitlab(field: keyof StorageConfig["gitlab"], value: string) {
    setDraft((d) => ({ ...d, gitlab: { ...d.gitlab, [field]: value } }))
    setTestResult(null)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const active: StorageConfig = { ...draft, provider }
      const result = await testConnection(active)
      setTestResult(result.ok ? { ok: true, label: result.label } : { ok: false, error: result.error })
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    const finalCfg: StorageConfig = { ...draft, provider }
    // Basic validation for the active provider
    if (provider === "github") {
      const g = finalCfg.github
      if (!g.token || !g.owner || !g.repo) {
        toast({ title: "Заполни token, owner и repo для GitHub", variant: "destructive" })
        return
      }
    } else {
      const gl = finalCfg.gitlab
      if (!gl.token || !gl.projectId) {
        toast({ title: "Заполни token и project id для GitLab", variant: "destructive" })
        return
      }
    }
    saveConfig(finalCfg)
    onSaved(finalCfg)
    onOpenChange(false)
    toast({ title: "Настройки сохранены", description: `Активен: ${provider}` })
  }

  function handleClear() {
    clearConfig()
    setDraft(DEFAULT_CONFIG)
    onSaved(DEFAULT_CONFIG)
    toast({ title: "Настройки сброшены" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Подключение к GitHub / GitLab
          </DialogTitle>
          <DialogDescription>
            Настройки хранятся только в этом браузере (localStorage). Token не отправляется
            ни на какой сервер — браузер сам ходит в API GitHub/GitLab.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={provider} onValueChange={(v) => setProvider(v as "github" | "gitlab")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="github">GitHub Pages</TabsTrigger>
            <TabsTrigger value="gitlab">GitLab Pages</TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="space-y-3 pt-3">
            <Field
              label="Personal Access Token"
              hint="Fine-grained, Contents: Read & Write на репо experiments"
              type="password"
              value={draft.github.token}
              onChange={(v) => patchGithub("token", v)}
              placeholder="github_pat_xxxxx..."
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Owner"
                value={draft.github.owner}
                onChange={(v) => patchGithub("owner", v)}
                placeholder="your-org"
              />
              <Field
                label="Repo"
                value={draft.github.repo}
                onChange={(v) => patchGithub("repo", v)}
                placeholder="experiments"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Branch"
                value={draft.github.branch}
                onChange={(v) => patchGithub("branch", v)}
                placeholder="main"
              />
              <Field
                label="Path prefix (optional)"
                value={draft.github.pathPrefix}
                onChange={(v) => patchGithub("pathPrefix", v)}
                placeholder="experiments"
              />
            </div>
            <Field
              label="Pages base URL (optional)"
              hint="Кастомный домен; иначе https://{owner}.github.io/{repo}"
              value={draft.github.pagesBase}
              onChange={(v) => patchGithub("pagesBase", v)}
              placeholder="https://experiments.yourdomain.com"
            />
          </TabsContent>

          <TabsContent value="gitlab" className="space-y-3 pt-3">
            <Field
              label="Access Token"
              hint="Scope: api на проекте"
              type="password"
              value={draft.gitlab.token}
              onChange={(v) => patchGitlab("token", v)}
              placeholder="glpat-xxxx..."
            />
            <Field
              label="Project ID"
              hint="namespace/project или числовой id"
              value={draft.gitlab.projectId}
              onChange={(v) => patchGitlab("projectId", v)}
              placeholder="your-group/experiments"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Branch"
                value={draft.gitlab.branch}
                onChange={(v) => patchGitlab("branch", v)}
                placeholder="main"
              />
              <Field
                label="Path prefix (optional)"
                value={draft.gitlab.pathPrefix}
                onChange={(v) => patchGitlab("pathPrefix", v)}
                placeholder="experiments"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Pages base URL (optional)"
                value={draft.gitlab.pagesBase}
                onChange={(v) => patchGitlab("pagesBase", v)}
                placeholder="https://ns.gitlab.io/proj"
              />
              <Field
                label="API base (self-hosted)"
                value={draft.gitlab.apiBase}
                onChange={(v) => patchGitlab("apiBase", v)}
                placeholder="https://gitlab.com/api/v4"
              />
            </div>
          </TabsContent>
        </Tabs>

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-md p-2 text-xs ${
              testResult.ok
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {testResult.ok ? (
                <p>Подключено: <code className="font-mono">{testResult.label}</code></p>
              ) : (
                <p className="break-words">{testResult.error}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleClear}>
            <Trash2 className="h-4 w-4" /> Сбросить
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing} className="gap-1.5">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Проверить
            </Button>
            <Button size="sm" onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </DialogFooter>

        <div className="flex items-center gap-1.5 border-t pt-3 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="font-mono text-[10px]">localStorage</Badge>
          <span>токен виден только JS этой страницы; используйте fine-grained PAT, scoped на один репо</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-xs"
        autoComplete="off"
        spellCheck={false}
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
