import { z } from "zod";

// Owner-entered URLs are rendered as href/src on a public page, so only
// plain https URLs are accepted — never javascript:, data: or http:.
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => v || null)
  .refine((v) => {
    if (v === null) return true;
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a full https:// link");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Every service needs a name").max(80),
  description: z.string().trim().max(300).optional(),
  priceFrom: z.coerce.number().min(0).max(10_000_000).optional(),
});

export const siteSchema = z.object({
  published: z.boolean(),
  headline: optionalText(120),
  tagline: optionalText(200),
  about: optionalText(2000),
  phone: optionalText(30),
  whatsappNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\+?[\d\s-]{7,20}$/.test(v), "Use digits, with country code (e.g. +91 90000 00000)"),
  address: optionalText(300),
  hours: optionalText(300),
  mapUrl: httpsUrl,
  heroImageUrl: httpsUrl,
  accent: z.enum(["green", "blue", "amber", "slate"]),
  services: z.array(serviceSchema).max(20, "Up to 20 services"),
});

export function parseServicesJson(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw === "") return [];
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
