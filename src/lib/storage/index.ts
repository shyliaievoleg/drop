import type {
  ExperimentMeta,
  ProviderName,
  ProviderClient,
  PublishResult,
  StorageConfig,
} from "./types"
import { githubClient } from "./github"
import { gitlabClient } from "./gitlab"
import { activeProviderConfig } from "./config"

export function getProviderClient(name: ProviderName): ProviderClient<unknown> {
  return (name === "gitlab" ? gitlabClient : githubClient) as ProviderClient<unknown>
}

export function listExperiments(cfg: StorageConfig): Promise<ExperimentMeta[]> {
  const client = cfg.provider === "gitlab" ? gitlabClient : githubClient
  return client.listExperiments(activeProviderConfig(cfg) as never)
}

export async function getExperimentFull(
  cfg: StorageConfig,
  slug: string,
): Promise<{ html: string; sha: string; updatedAt: string | null }> {
  const client = cfg.provider === "gitlab" ? gitlabClient : githubClient
  return client.getExperiment(activeProviderConfig(cfg) as never, slug)
}

export async function putExperiment(
  cfg: StorageConfig,
  slug: string,
  html: string,
  title: string,
  prevSha?: string,
): Promise<PublishResult> {
  const client = cfg.provider === "gitlab" ? gitlabClient : githubClient
  return client.putExperiment(activeProviderConfig(cfg) as never, slug, html, title, prevSha)
}

export async function deleteExperiment(
  cfg: StorageConfig,
  slug: string,
  sha: string,
): Promise<void> {
  const client = cfg.provider === "gitlab" ? gitlabClient : githubClient
  return client.deleteExperiment(activeProviderConfig(cfg) as never, slug, sha)
}

export async function testConnection(
  cfg: StorageConfig,
): Promise<{ ok: true; label: string } | { ok: false; error: string }> {
  const client = cfg.provider === "gitlab" ? gitlabClient : githubClient
  return client.testConnection(activeProviderConfig(cfg) as never)
}

export type { StorageConfig, ExperimentMeta, PublishResult, ProviderName } from "./types"
export {
  DATOCMS_LIMIT_BYTES,
  formatBytes,
  isValidSlug,
  slugify,
  extractTitle,
} from "./types"
export { loadConfig, saveConfig, clearConfig, isConfigured, activeProviderConfig, DEFAULT_CONFIG } from "./config"
export {
  type SandboxFlags,
  DEFAULT_SANDBOX_FLAGS,
  SANDBOX_FLAG_META,
  loadSandboxFlags,
  saveSandboxFlags,
  buildSandboxString,
  countActiveFlags,
} from "./sandbox"
