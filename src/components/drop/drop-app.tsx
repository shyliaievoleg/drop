"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, FileCode2, BookOpen, Settings2, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ExperimentList } from "./experiment-list"
import { ExperimentEditor } from "./experiment-editor"
import { ConfigBadge } from "./config-badge"
import { SettingsDialog } from "./settings-dialog"
import { toast } from "@/hooks/use-toast"
import {
  deleteExperiment,
  isConfigured,
  listExperiments,
  loadConfig,
  type ExperimentMeta,
  type StorageConfig,
} from "@/lib/storage"

export function DropApp() {
  const [config, setConfig] = useState<StorageConfig | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [experiments, setExperiments] = useState<ExperimentMeta[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ExperimentMeta | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)

  // Initial config load from localStorage.
  useEffect(() => {
    const saved = loadConfig()
    setConfig(saved)
    if (!isConfigured(saved)) {
      setSettingsOpen(true)
    }
  }, [])

  const refreshList = useCallback(async (cfg: StorageConfig) => {
    setLoadingList(true)
    setListError(null)
    try {
      const list = await listExperiments(cfg)
      setExperiments(list)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setListError(message)
      setExperiments([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (config && isConfigured(config)) {
      refreshList(config)
    } else {
      setExperiments([])
    }
  }, [config, refreshList])

  const handleSelect = useCallback((exp: ExperimentMeta) => {
    setEditing(exp)
    setEditorKey((k) => k + 1)
  }, [])

  const handleNew = useCallback(() => {
    setEditing(null)
    setEditorKey((k) => k + 1)
  }, [])

  const handlePublished = useCallback(
    (_slug: string, _sha: string) => {
      if (config && isConfigured(config)) refreshList(config)
    },
    [config, refreshList],
  )

  const handleDelete = useCallback(
    async (slug: string, sha: string) => {
      if (!config) return
      try {
        await deleteExperiment(config, slug, sha)
        setExperiments((prev) => prev.filter((e) => e.slug !== slug))
        if (editing?.slug === slug) handleNew()
        toast({ title: "Удалено из репозитория" })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        toast({ title: "Не удалось удалить", description: message, variant: "destructive" })
      }
    },
    [config, editing, handleNew],
  )

  const handleSettingsSaved = useCallback((cfg: StorageConfig) => {
    setConfig(cfg)
    setEditing(null)
    setEditorKey((k) => k + 1)
  }, [])

  const configured = isConfigured(config)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="text-base font-semibold tracking-tight">Drop</h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Публикация дизайн-экспериментов на GitHub / GitLab Pages
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ConfigBadge config={config} onOpenSettings={() => setSettingsOpen(true)} />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <Button
              onClick={handleNew}
              size="sm"
              className="gap-1.5"
              disabled={!configured}
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Новый</span><span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {configured ? (
          <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[380px_1fr]">
            <aside className="min-w-0 border-b lg:border-b-0 lg:border-r">
              <Card className="h-full rounded-none border-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>Эксперименты</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {experiments.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[55vh] lg:h-[calc(100vh-13rem)]">
                    <ExperimentList
                      experiments={experiments}
                      activeSlug={editing?.slug ?? null}
                      loading={loadingList}
                      error={listError}
                      onSelect={handleSelect}
                      onDelete={handleDelete}
                    />
                  </div>
                </CardContent>
              </Card>
            </aside>

            <section className="min-w-0 min-h-[calc(100vh-4rem)]">
              <ExperimentEditor
                key={editorKey}
                initial={editing}
                config={config!}
                onPublished={handlePublished}
              />
            </section>
          </div>
        ) : (
          <EmptyState onOpenSettings={() => setSettingsOpen(true)} />
        )}
      </main>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
          <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Drop SPA · браузер сам ходит в GitHub/GitLab API, токен в localStorage,
                статику можно хостить на GitHub Pages или Netlify.
              </p>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  {helpOpen ? "Скрыть инструкцию" : "Как это работает"}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-3 space-y-2 text-xs text-muted-foreground">
              <ol className="ml-4 list-decimal space-y-1.5">
                <li>Нажми бейдж провайдера в шапке → заполни токен и данные репозитория.</li>
                <li>Создай репо <code className="font-mono">experiments</code> с включёнными GitHub/GitLab Pages.</li>
                <li>Вставь HTML/CSS/JS в редактор → «Опубликовать» → браузер закоммитит <code className="font-mono">{`{slug}/index.html`}</code> через Contents API.</li>
                <li>Скопируй embed-сниппет с <code className="font-mono">&lt;iframe sandbox&gt;</code> в блок DatoCMS.</li>
              </ol>
              <p className="text-[11px]">
                Fine-grained PAT scoped на один репо — токен виден только JS этой страницы,
                взрывной радиус минимальный. Для авто-высоты сниппет шлёт
                <code className="font-mono"> postMessage({'{type:"experiment-height",h}'})</code>.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={handleSettingsSaved}
      />
    </div>
  )
}

function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <HardDrive className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Подключи репозиторий</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Drop хранит эксперименты прямо в GitHub/GitLab репозитории. Настрой
          подключение — и браузер сам будет коммитить файлы через API.
        </p>
      </div>
      <Button onClick={onOpenSettings} className="gap-2">
        <Settings2 className="h-4 w-4" /> Настроить подключение
      </Button>
    </div>
  )
}
