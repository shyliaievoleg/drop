import type { StorageConfig, ProviderName } from "./types"

const STORAGE_KEY = "drop.config.v1"

export const DEFAULT_CONFIG: StorageConfig = {
  provider: "github",
  github: {
    token: "",
    owner: "",
    repo: "",
    branch: "main",
    pathPrefix: "",
    pagesBase: "",
  },
  gitlab: {
    token: "",
    projectId: "",
    branch: "main",
    pathPrefix: "",
    pagesBase: "",
    apiBase: "https://gitlab.com/api/v4",
  },
}

export function loadConfig(): StorageConfig | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StorageConfig>
    // Merge with defaults so new fields don't break older saved configs.
    return {
      provider: parsed.provider === "gitlab" ? "gitlab" : "github",
      github: { ...DEFAULT_CONFIG.github, ...parsed.github },
      gitlab: { ...DEFAULT_CONFIG.gitlab, ...parsed.gitlab },
    }
  } catch {
    return null
  }
}

export function saveConfig(cfg: StorageConfig): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function clearConfig(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function isConfigured(cfg: StorageConfig | null): cfg is StorageConfig {
  if (!cfg) return false
  const active: ProviderName = cfg.provider
  if (active === "github") {
    const g = cfg.github
    return Boolean(g.token && g.owner && g.repo)
  }
  const gl = cfg.gitlab
  return Boolean(gl.token && gl.projectId)
}

export function activeProviderConfig(cfg: StorageConfig) {
  return cfg.provider === "gitlab" ? cfg.gitlab : cfg.github
}
