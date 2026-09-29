import { randomBytes } from "crypto";
import { slugify } from "./slug";

export const REF_COOKIE = "vs_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — typical influencer attribution window

export const CHANNELS = [
  { value: "influencer", label: "Influencer" },
  { value: "instagram_ads", label: "Instagram ads" },
  { value: "google_ads", label: "Google ads" },
  { value: "flyer", label: "Flyer / QR" },
  { value: "other", label: "Other" },
] as const;

export const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(CHANNELS.map((c) => [c.value, c.label]));

// Readable prefix from the partner/name + random suffix, e.g. "rahul-k3f9".
// Uniqueness per org is enforced by a DB index; callers retry on conflict.
export function generateLinkCode(seed: string): string {
  const base = slugify(seed).slice(0, 20).replace(/-+$/g, "") || "link";
  const suffix = randomBytes(3).toString("hex").slice(0, 4);
  return `${base}-${suffix}`;
}

export function isValidLinkCode(code: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(code);
}

// flat = fixed amount per booked lead; percent = share of revenue collected
// from leads that came through the link.
export function commissionOwed(
  type: "none" | "flat" | "percent",
  value: number | null,
  bookedLeads: number,
  revenue: number,
): number {
  if (type === "none" || !value || value <= 0) return 0;
  const raw = type === "flat" ? value * bookedLeads : (revenue * value) / 100;
  return Math.round(raw * 100) / 100;
}
