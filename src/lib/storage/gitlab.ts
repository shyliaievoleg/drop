import type { GitLabConfig, ExperimentMeta, PublishResult, ProviderClient } from "./types"
import { decodeBase64, encodeBase64 } from "./base64"

function apiBase(cfg: GitLabConfig): string {
  return (cfg.apiBase || "https://gitlab.com/api/v4").replace(/\/+$/, "")
}

async function glFetch<T>(
  cfg: GitLabConfig,
  path: string,
  opts: RequestInit = {},
): Promise<Response> {
  if (!cfg.token) throw new Error("GitLab token is empty")
  if (!cfg.projectId) throw new Error("GitLab project id required")
  const res = await fetch(`${apiBase(cfg)}${path}`, {
    ...opts,
    headers: {
      "PRIVATE-TOKEN": cfg.token,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    let message = `GitLab API ${res.status}`
    try {
      const data = await res.json()
      if (data?.message) message += `: ${Array.isArray(data.message) ? data.message.join("; ") : data.message}`
    } catch {
      /* keep generic */
    }
    throw new Error(message)
  }
  return res
}

function projectScope(cfg: GitLabConfig): string {
  return encodeURIComponent(cfg.projectId)
}

function filePath(cfg: GitLabConfig, slug: string): string {
  const prefix = cfg.pathPrefix.replace(/^\/+|\/+$/g, "")
  return prefix ? `${prefix}/${slug}/index.html` : `${slug}/index.html`
}

function encodedFilePath(cfg: GitLabConfig, slug: string): string {
  return encodeURIComponent(filePath(cfg, slug))
}

export function gitlabPublicUrl(cfg: GitLabConfig, slug: string): string {
  if (cfg.pagesBase) return `${cfg.pagesBase.replace(/\/+$/, "")}/${slug}/`
  // Fallback: derive from projectId "namespace/project"
  const parts = cfg.projectId.split("/")
  if (parts.length === 2) {
    return `https://${parts[0]}.gitlab.io/${parts[1]}/${slug}/`
  }
  return `${apiBase(cfg)}/projects/${projectScope(cfg)}/repository/${filePath(cfg, slug).replace(/\/index\.html$/, "/")}raw`
}

interface TreeEntry {
  path: string
  type: "blob" | "tree"
  size?: number
  id: string
}

interface FileResponse {
  content: string
  sha: string
  last_commit_id: string
}

interface MutateResponse {
  commit_id?: string
  content?: { sha?: string; blob_id?: string }
}

interface ProjectResponse {
  path_with_namespace: string
  default_branch: string
}

export const gitlabClient: ProviderClient<GitLabConfig> = {
  name: "gitlab",

  async listExperiments(cfg): Promise<ExperimentMeta[]> {
    const prefix = cfg.pathPrefix.replace(/^\/+|\/+$/g, "")
    const pathParam = prefix ? `&path=${encodeURIComponent(prefix)}&recursive=true` : "&recursive=true"
    const res = await glFetch(
      cfg,
      `/projects/${projectScope(cfg)}/repository/tree?ref=${encodeURIComponent(cfg.branch)}&per_page=100${pathParam}`,
    )
    const entries = (await res.json()) as TreeEntry[]
    const exps = entries
      .filter((e) => e.type === "blob" && /(?:^|\/)index\.html$/.test(e.path))
      .filter((e) => !prefix || e.path.startsWith(prefix + "/"))
      .map((e) => {
        const parts = e.path.split("/")
        const slug = parts[parts.length - 2] ?? parts[parts.length - 1]
        return {
          slug,
          provider: "gitlab" as const,
          publicUrl: gitlabPublicUrl(cfg, slug),
          sha: e.id,
          sizeBytes: e.size ?? 0,
        } satisfies ExperimentMeta
      })
    const seen = new Set<string>()
    return exps.filter((e) => (seen.has(e.slug) ? false : (seen.add(e.slug), true)))
  },

  async getExperiment(cfg, slug) {
    const res = await glFetch<FileResponse>(
      cfg,
      `/projects/${projectScope(cfg)}/repository/files/${encodedFilePath(cfg, slug)}?ref=${encodeURIComponent(cfg.branch)}`,
    )
    const data = await res.json() as FileResponse
    const html = decodeBase64(data.content)
    return { html, sha: data.sha ?? data.last_commit_id, updatedAt: null }
  },

  async putExperiment(cfg, slug, html, title, prevSha) {
    // Probe to decide POST (create) vs PUT (update).
    let method: "POST" | "PUT" = "POST"
    try {
      const probe = await glFetch(
        cfg,
        `/projects/${projectScope(cfg)}/repository/files/${encodedFilePath(cfg, slug)}?ref=${encodeURIComponent(cfg.branch)}`,
      )
      if (probe.status === 200) method = "PUT"
      await probe.json()
    } catch {
      /* 404 → create */
    }
    const res = await glFetch(
      cfg,
      `/projects/${projectScope(cfg)}/repository/files/${encodedFilePath(cfg, slug)}`,
      {
        method,
        body: JSON.stringify({
          branch: cfg.branch,
          content: html,
          commit_message: `chore(experiments): ${method === "PUT" ? "update" : "publish"} ${slug} — ${title}`,
        }),
      },
    )
    const data = (await res.json()) as MutateResponse
    const sha = data.content?.sha ?? prevSha ?? ""
    return {
      slug,
      publicUrl: gitlabPublicUrl(cfg, slug),
      sha,
      commitSha: data.commit_id,
    } satisfies PublishResult
  },

  async deleteExperiment(cfg, slug, _sha) {
    await glFetch(
      cfg,
      `/projects/${projectScope(cfg)}/repository/files/${encodedFilePath(cfg, slug)}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          branch: cfg.branch,
          commit_message: `chore(experiments): delete ${slug}`,
        }),
      },
    )
  },

  async testConnection(cfg) {
    try {
      const res = await glFetch<ProjectResponse>(
        cfg,
        `/projects/${projectScope(cfg)}`,
      )
      const data = await res.json() as ProjectResponse
      return { ok: true as const, label: `${data.path_with_namespace} (default: ${data.default_branch})` }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
    }
  },
}
