function hasControlOrBackslash(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x5c /* backslash */) return true;
  }
  return false;
}

/**
 * Returns `next` only if it's a safe, same-site relative path — otherwise
 * null. Guards against open redirects, including the backslash tricks
 * (`/\evil.com`, `\/\/evil.com`) browsers normalize to a protocol-relative
 * URL, and embedded control characters.
 */
export function safeNext(next: string | undefined | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (hasControlOrBackslash(next)) return null;
  // final guard: it must resolve to our own origin, not an external host
  try {
    const base = "http://internal.local";
    const resolved = new URL(next, base);
    if (resolved.origin !== base) return null;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}
