import "server-only";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  integrations,
  invoices,
  leads,
  orgSites,
  organizations,
  profiles,
  quotations,
  stockItems,
  trackingLinks,
  vehicles,
} from "@/db/schema";
import type { SetupKey } from "@/lib/guide-content";
import type { WhatsAppSettings } from "@/lib/integrations";

// Which setup steps are already done in this workspace — real counts, so the
// Guide's checklist ticks itself. Everything is scoped to the caller's org.
export async function getSetupStatus(orgId: string, userId: string): Promise<Record<SetupKey, boolean>> {
  const n = async (q: Promise<{ c: number }[]>) => (await q)[0]?.c ?? 0;

  const [org, me, teamSize, vehicleCount, stockCount, linkCount, leadCount, quoteCount, invoiceCount, site, connected] = await Promise.all([
    db
      .select({ legalName: organizations.legalName, gstin: organizations.gstin, stateCode: organizations.stateCode })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),
    db.select({ phone: profiles.phone }).from(profiles).where(eq(profiles.id, userId)).limit(1),
    n(db.select({ c: count() }).from(profiles).where(eq(profiles.orgId, orgId))),
    n(db.select({ c: count() }).from(vehicles).where(eq(vehicles.orgId, orgId))),
    n(db.select({ c: count() }).from(stockItems).where(eq(stockItems.orgId, orgId))),
    n(db.select({ c: count() }).from(trackingLinks).where(eq(trackingLinks.orgId, orgId))),
    n(db.select({ c: count() }).from(leads).where(eq(leads.orgId, orgId))),
    n(db.select({ c: count() }).from(quotations).where(eq(quotations.orgId, orgId))),
    n(db.select({ c: count() }).from(invoices).where(eq(invoices.orgId, orgId))),
    db.select({ published: orgSites.published }).from(orgSites).where(eq(orgSites.orgId, orgId)).limit(1),
    db
      .select({ provider: integrations.provider, settings: integrations.settings })
      .from(integrations)
      .where(and(eq(integrations.orgId, orgId), isNotNull(integrations.connectedAt))),
  ]);

  const has = (p: string) => connected.some((c) => c.provider === p);
  const templates = (connected.find((c) => c.provider === "whatsapp")?.settings as WhatsAppSettings | undefined)?.templates ?? {};

  return {
    billing: Boolean(org[0]?.legalName || org[0]?.gstin || org[0]?.stateCode),
    team: teamSize > 1,
    vehicles: vehicleCount > 0,
    stock: stockCount > 0,
    site: Boolean(site[0]?.published),
    link: linkCount > 0,
    phone: Boolean(me[0]?.phone),
    whatsapp: has("whatsapp"),
    templates: Object.keys(templates).length > 0,
    email: has("email"),
    payments: has("razorpay"),
    lead: leadCount > 0,
    quote: quoteCount > 0,
    invoice: invoiceCount > 0,
  };
}

// Booleans only — never the values. Lets the owner see what is missing on
// the server without exposing any secret.
export function serverConfig() {
  const set = (name: string) => Boolean(process.env[name]);
  return [
    { name: "CRON_SECRET", ok: set("CRON_SECRET"), needed: "Protects the nightly reminders job. Without it, anyone can trigger it." },
    { name: "INTEGRATIONS_ENCRYPTION_KEY", ok: set("INTEGRATIONS_ENCRYPTION_KEY"), needed: "Encrypts saved WhatsApp, email and Razorpay credentials. Without it, connecting an integration fails." },
    { name: "WHATSAPP_APP_SECRET", ok: set("WHATSAPP_APP_SECRET"), needed: "Verifies Meta's webhook, so incoming WhatsApp messages can become leads." },
    { name: "WHATSAPP_VERIFY_TOKEN", ok: set("WHATSAPP_VERIFY_TOKEN"), needed: "The handshake string you enter once in Meta's webhook setup." },
  ];
}

