// Structured, PII-scrubbed logging. One JSON line per event so Vercel's log
// search can filter on fields. Never pass raw request bodies or customer
// records here; scrub() is a safety net, not permission.

const PHONE = /\(?\+?\d[\d\s().-]{8,}\d/g;
const EMAIL = /[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+/g;

export function scrub(text: string): string {
  return text.replace(EMAIL, "[email]").replace(PHONE, "[phone]");
}

type Level = "info" | "warn" | "error";

function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === "string" ? scrub(v) : v])),
  });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};
