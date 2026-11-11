"use client"

import { Copy, ExternalLink, FileCode2, Loader2, Trash2, AlertCircle, CheckCircle2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/hooks/use-toast"
import { formatBytes, type ExperimentMeta } from "@/lib/storage"

function StatusDot({ sha }: { sha: string }) {
  return sha ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
  ) : (
    <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
  )
}

interface ExperimentListProps {
  experiments: ExperimentMeta[]
  activeSlug: string | null
  loading: boolean
  error: string | null
  onSelect: (exp: ExperimentMeta) => void
  onDelete: (slug: string, sha: string) => void
}

export function ExperimentList({
  experiments,
  activeSlug,
  loading,
  error,
  onSelect,
  onDelete,
}: ExperimentListProps) {
  if (loading && experiments.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading from repository…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive/60" />
        <p className="text-sm font-medium text-destructive">Failed to load list</p>
        <p className="max-w-xs text-xs text-muted-foreground break-words">{error}</p>
      </div>
    )
  }

  if (experiments.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 p-8 text-center">
        <FileCode2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Repository is empty</p>
        <p className="text-xs text-muted-foreground">
          Publish your first experiment on the right — it will appear in the repository and here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-2 p-3">
        {experiments.map((exp) => {
          const isActive = exp.slug === activeSlug
          return (
            <Card
              key={`${exp.provider}-${exp.slug}`}
              className={`min-w-0 overflow-hidden cursor-pointer transition-colors ${
                isActive ? "border-primary bg-accent/50" : "hover:bg-accent/30"
              }`}
              onClick={() => onSelect(exp)}
            >
              <CardContent className="min-w-0 p-3">
                <div className="flex items-start gap-2">
                  <StatusDot sha={exp.sha} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{exp.slug}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                        {exp.provider}
                      </Badge>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                        {formatBytes(exp.sizeBytes)}
                      </Badge>
                    </div>

                    {exp.publicUrl && (
                      <div className="mt-2 flex items-center gap-1">
                        <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">
                          {exp.publicUrl}
                        </code>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigator.clipboard.writeText(exp.publicUrl)
                                  toast({ title: "URL copied" })
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy URL</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <a href={exp.publicUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(exp)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialog>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Delete from repository</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{exp.slug}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The file {exp.slug}/index.html will be deleted from the repository via a commit.
                            Embeds on the site will stop working until the URL is removed from DatoCMS.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(exp.slug, exp.sha)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
