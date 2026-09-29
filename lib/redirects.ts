// Only same-site paths are allowed as post-auth redirect targets. Anything
// else — absolute URLs, protocol-relative `//host`, backslash tricks — falls
// back, so `/login?next=https://evil.example` can't bounce users off-site.
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n\t]/.test(next)) return fallback;
  return next;
}
