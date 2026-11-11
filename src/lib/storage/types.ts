export type ProviderName = "github" | "gitlab"

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
  branch: string
  pathPrefix: string
  pagesBase: string
}

export interface GitLabConfig {
  token: string
  /** "namespace/project" or numeric id */
  projectId: string
  branch: string
  pathPrefix: string
  pagesBase: string
  /** Self-hosted GitLab base, default https://gitlab.com/api/v4 */
  apiBase: string
}

export interface StorageConfig {
  provider: ProviderName
  github: GitHubConfig
  gitlab: GitLabConfig
}

export interface Experiment {
  slug: string
  title: string
  html: string
  provider: ProviderName
  publicUrl: string
  sha: string
  sizeBytes: number
  updatedAt: string | null
}

export interface ExperimentMeta {
  slug: string
  provider: ProviderName
  publicUrl: string
  sha: string
  sizeBytes: number
}

export interface PublishResult {
  slug: string
  publicUrl: string
  sha: string
  commitSha?: string
}

export interface ProviderClient<C> {
  name: ProviderName
  listExperiments(cfg: C): Promise<ExperimentMeta[]>
  getExperiment(cfg: C, slug: string): Promise<{ html: string; sha: string; updatedAt: string | null }>
  putExperiment(cfg: C, slug: string, html: string, title: string, prevSha?: string): Promise<PublishResult>
  deleteExperiment(cfg: C, slug: string, sha: string): Promise<void>
  testConnection(cfg: C): Promise<{ ok: true; label: string } | { ok: false; error: string }>
}

export const DATOCMS_LIMIT_BYTES = 300 * 1024

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Extracts <title>…</title> from an HTML document, falls back to slug. */
export function extractTitle(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const t = m?.[1]?.trim()
  return t && t.length > 0 ? t : fallback
}
