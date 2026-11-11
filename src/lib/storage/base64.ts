/**
 * UTF-8 safe base64 helpers for the browser. `btoa`/`atob` work on Latin-1
 * strings only, so we go through TextEncoder/TextDecoder to handle non-ASCII
 * (Cyrillic, emoji, etc.) in designer HTML.
 */
export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function decodeBase64(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ""))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder("utf-8").decode(bytes)
}
