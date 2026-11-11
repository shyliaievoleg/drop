/**
 * Sandbox flags for the experiment iframe.
 *
 * `allow-scripts` is ALWAYS on (required for any interactivity) and is not
 * exposed as a toggle. The flags below are the ones a designer might want to
 * flip depending on what the experiment does.
 *
 * Defaults are chosen so that common experiments (interactive widgets,
 * forms, modals, share links) work out of the box, while capabilities that
 * are niche or risky start OFF.
 */

export interface SandboxFlags {
  /** Access cookies, localStorage, same-origin fetch. Default ON. */
  allowSameOrigin: boolean
  /** alert(), confirm(), prompt(). Default OFF. */
  allowModals: boolean
  /** Submit forms. Default OFF. */
  allowForms: boolean
  /** window.open(), target="_blank" links. Default OFF. */
  allowPopups: boolean
  /** Trigger file downloads (Chrome). Default OFF. */
  allowDownloads: boolean
  /** Popups opened from the iframe don't inherit sandbox. Default OFF. */
  allowPopupsToEscape: boolean
  /** Pointer Lock API (games, 3D). Default OFF. */
  allowPointerLock: boolean
  /** Navigate the host site on user click — risky. Default OFF. */
  allowTopNavigationByUserActivation: boolean
  /** Presentation API (cast to screen). Default OFF. */
  allowPresentation: boolean
}

export const DEFAULT_SANDBOX_FLAGS: SandboxFlags = {
  allowSameOrigin: true,
  allowModals: false,
  allowForms: false,
  allowPopups: false,
  allowDownloads: false,
  allowPopupsToEscape: false,
  allowPointerLock: false,
  allowTopNavigationByUserActivation: false,
  allowPresentation: false,
}

const STORAGE_KEY = "drop.sandbox.v1"

export function loadSandboxFlags(): SandboxFlags {
  if (typeof window === "undefined") return DEFAULT_SANDBOX_FLAGS
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_SANDBOX_FLAGS
  try {
    const parsed = JSON.parse(raw) as Partial<SandboxFlags>
    return { ...DEFAULT_SANDBOX_FLAGS, ...parsed }
  } catch {
    return DEFAULT_SANDBOX_FLAGS
  }
}

export function saveSandboxFlags(flags: SandboxFlags): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

interface FlagMeta {
  key: keyof SandboxFlags
  token: string
  label: string
  hint: string
  risky?: boolean
}

export const SANDBOX_FLAG_META: FlagMeta[] = [
  {
    key: "allowSameOrigin",
    token: "allow-same-origin",
    label: "same-origin",
    hint: "Cookies, localStorage, same-origin fetch",
  },
  {
    key: "allowModals",
    token: "allow-modals",
    label: "modals",
    hint: "alert(), confirm(), prompt()",
  },
  {
    key: "allowForms",
    token: "allow-forms",
    label: "forms",
    hint: "Submit forms",
  },
  {
    key: "allowPopups",
    token: "allow-popups",
    label: "popups",
    hint: "window.open(), target=\"_blank\"",
  },
  {
    key: "allowDownloads",
    token: "allow-downloads",
    label: "downloads",
    hint: "Trigger file downloads (Chrome)",
  },
  {
    key: "allowPopupsToEscape",
    token: "allow-popups-to-escape-sandbox",
    label: "popups escape",
    hint: "Popups don't inherit sandbox",
  },
  {
    key: "allowPointerLock",
    token: "allow-pointer-lock",
    label: "pointer lock",
    hint: "For games / 3D scenes",
  },
  {
    key: "allowTopNavigationByUserActivation",
    token: "allow-top-navigation-by-user-activation",
    label: "top-nav (click)",
    hint: "Redirect host site on click — risky",
    risky: true,
  },
  {
    key: "allowPresentation",
    token: "allow-presentation",
    label: "presentation",
    hint: "Presentation API (cast)",
  },
]

export function buildSandboxString(flags: SandboxFlags): string {
  const parts = ["allow-scripts"]
  for (const meta of SANDBOX_FLAG_META) {
    if (flags[meta.key]) parts.push(meta.token)
  }
  return parts.join(" ")
}

export function countActiveFlags(flags: SandboxFlags): number {
  return SANDBOX_FLAG_META.filter((m) => flags[m.key]).length
}
