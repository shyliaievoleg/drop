import type { GitHubConfig, ExperimentMeta, PublishResult, ProviderClient } from "./types"
import { decodeBase64, encodeBase64 } from "./base64"

const GITHUB_API = "https://api.github.com"

interface GHResponse<T> extends Response {
  json: () => Promise<T>
}

async function ghFetch<T>(
  cfg: GitHubConfig,
  path: string,
  opts: RequestInit = {},
): Promise<GHResponse<T>> {
  if (!cfg.token) throw new Error("GitHub token is empty")
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    let message = `GitHub API ${res.status}`
    try {
      const data = await res.json()
      if (data?.message) message += `: ${data.message}`
    } catch {
      /* keep generic */
    }
    throw new Error(message)
  }
  return res as GHResponse<T>
}

function filePath(cfg: GitHubConfig, slug: string): string {
  const prefix = cfg.pathPrefix.replace(/^\/+|\/+$/g, "")
  return prefix ? `${prefix}/${slug}/index.html` : `${slug}/index.html`
}

export function githubPublicUrl(cfg: GitHubConfig, slug: string): string {
  if (cfg.pagesBase) return `${cfg.pagesBase.replace(/\/+$/, "")}/${slug}/`
  return `https://${cfg.owner}.github.io/${cfg.repo}/${slug}/`
}

interface TreeResponse {
  tree: Array<{ path: string; type: string; size: number; sha: string }>
  truncated?: boolean
}

interface ContentResponse {
  content: string
  sha: string
  encoding: string
}

interface PutResponse {
  commit?: { sha?: string }
  content?: { sha?: string }
}

interface RepoResponse {
  full_name: string
  default_branch: string
}

export const githubClient: ProviderClient<GitHubConfig> = {
  name: "github",

  async listExperiments(cfg): Promise<ExperimentMeta[]> {
    if (!cfg.owner || !cfg.repo) throw new Error("GitHub owner/repo required")
    const res = await ghFetch<TreeResponse>(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1`,
    )
    const data = await res.json()
    const prefix = cfg.pathPrefix.replace(/^\/+|\/+$/g, "")
    const exps = data.tree
      .filter((e) => e.type === "blob" && /(?:^|\/)index\.html$/.test(e.path))
      .filter((e) => !prefix || e.path.startsWith(prefix + "/"))
      .map((e) => {
        const parts = e.path.split("/")
        const slug = parts[parts.length - 2] ?? parts[parts.length - 1]
        return {
          slug,
          provider: "github" as const,
          publicUrl: githubPublicUrl(cfg, slug),
          sha: e.sha,
          sizeBytes: e.size,
        } satisfies ExperimentMeta
      })
    // De-dup by slug (only one index.html per folder expected)
    const seen = new Set<string>()
    return exps.filter((e) => (seen.has(e.slug) ? false : (seen.add(e.slug), true)))
  },

  async getExperiment(cfg, slug) {
    const path = filePath(cfg, slug)
    const res = await ghFetch<ContentResponse>(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`,
    )
    const data = await res.json()
    const html = data.encoding === "base64" ? decodeBase64(data.content) : data.content
    return { html, sha: data.sha, updatedAt: null }
  },

  async putExperiment(cfg, slug, html, title, prevSha) {
    const path = filePath(cfg, slug)
    const body: Record<string, unknown> = {
      message: `chore(experiments): ${prevSha ? "update" : "publish"} ${slug} — ${title}`,
      content: encodeBase64(html),
      branch: cfg.branch,
    }
    if (prevSha) body.sha = prevSha
    const res = await ghFetch<PutResponse>(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/contents/${path}`,
      { method: "PUT", body: JSON.stringify(body) },
    )
    const data = await res.json()
    const sha = data.content?.sha ?? prevSha ?? ""
    return {
      slug,
      publicUrl: githubPublicUrl(cfg, slug),
      sha,
      commitSha: data.commit?.sha,
    } satisfies PublishResult
  },

  async deleteExperiment(cfg, slug, sha) {
    const path = filePath(cfg, slug)
    await ghFetch(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/contents/${path}`,
      {
        method: "DELETE",
        body: JSON.stringify({ message: `chore(experiments): delete ${slug}`, sha, branch: cfg.branch }),
      },
    )
  },

  async testConnection(cfg) {
    try {
      const res = await ghFetch<RepoResponse>(
        cfg,
        `/repos/${cfg.owner}/${cfg.repo}`,
      )
      const data = await res.json()
      return { ok: true as const, label: `${data.full_name} (default: ${data.default_branch})` }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
    }
  },
}
