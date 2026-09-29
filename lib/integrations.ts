import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrationProviderEnum, integrations } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";

export type IntegrationProvider = (typeof integrationProviderEnum.enumValues)[number];

// Shape of integrations.settings per provider (non-secret config only).
export type WhatsAppSettings = { templates?: Partial<Record<string, { name: string; language: string }>> };
export type EmailSettings = { fromAddress?: string };
export type RazorpaySettings = { keyId?: string };

export async function getIntegration(orgId: string, provider: IntegrationProvider) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider)))
    .limit(1);
  return row ?? null;
}

// Decrypts, returning null instead of throwing when the key is missing or
// rotated — callers fall back rather than fail the triggering action.
export function tryDecrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decryptSecret(value);
  } catch {
    return null;
  }
}
