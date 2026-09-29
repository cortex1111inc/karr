import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray, isNotNull, isNull, lt, lte, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, leads, organizations, profiles, rateLimits, stockItems } from "@/db/schema";
import { formatCurrency } from "@/lib/billing/money";
import { getSiteUrl } from "@/lib/site";
import { sendWhatsApp } from "@/lib/whatsapp";
import { renderReminderMessage } from "@/lib/whatsapp/templates";
import { notify } from "@/lib/notifications";

// Single consolidated daily job (Vercel Cron, see vercel.json) — kept as one
// route rather than one-per-concern so the project stays within a free-tier
// cron-job quota. Handles:
//   1. Service/rental retention reminders (WhatsApp)
//   2. In-app "follow-up due" nudges for leads
//   3. In-app "stale lead" nudges (no update in org.staleLeadDays days),
//      escalated to the owner at 2x that
//   4. In-app "low stock" nudges for the owner
//   5. Unpaid-invoice reminders (owner in-app + optional customer WhatsApp)
//   6. Pruning expired rate-limit windows
//
// Caps keep one run inside maxDuration. Service reminders call WhatsApp
// (slow, external) but each row rolls its due date forward once handled, so
// a small cap just defers the remainder to the next run. The notification
// sections are DB-only and deduped rows stay selected, so they get a much
// larger cap — a small one could re-pick the same rows every run.
export const maxDuration = 60;
const WHATSAPP_BATCH = 200;
const NOTIFY_BATCH = 2000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const results = {
    serviceReminders: 0,
    followUpNudges: 0,
    staleLeadNudges: 0,
    lowStockNudges: 0,
    staleLeadEscalations: 0,
    invoiceReminders: 0,
    invoiceWhatsApps: 0,
  };

  // Cache each org's owner profile (fallback notification target for
  // unassigned leads) so we don't re-query it per lead.
  const ownerCache = new Map<string, string | null>();
  async function resolveOwnerId(orgId: string): Promise<string | null> {
    if (ownerCache.has(orgId)) return ownerCache.get(orgId)!;
    const [owner] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.orgId, orgId), eq(profiles.role, "owner")))
      .limit(1);
    const ownerId = owner?.id ?? null;
    ownerCache.set(orgId, ownerId);
    return ownerId;
  }

  // 1. Service reminders
  const dueForService = await db
    .select({
      customerId: customers.id,
      orgId: customers.orgId,
      fullName: customers.fullName,
      phone: customers.phone,
      serviceIntervalDays: organizations.serviceIntervalDays,
      reminderMessage: organizations.reminderMessage,
    })
    .from(customers)
    .innerJoin(organizations, eq(customers.orgId, organizations.id))
    .where(
      and(
        lte(customers.nextServiceDueAt, now),
        or(isNull(customers.lastReminderSentAt), lte(customers.lastReminderSentAt, customers.nextServiceDueAt)),
      ),
    )
    .limit(WHATSAPP_BATCH);

  for (const customer of dueForService) {
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + customer.serviceIntervalDays);

    await sendWhatsApp({
      orgId: customer.orgId,
      to: customer.phone,
      kind: "service_reminder",
      customerId: customer.customerId,
      body: renderReminderMessage(customer.reminderMessage, customer.fullName),
      templateParams: [customer.fullName],
    });

    await db
      .update(customers)
      .set({ lastReminderSentAt: now, nextServiceDueAt: nextDue })
      .where(eq(customers.id, customer.customerId));

    results.serviceReminders += 1;
  }

  // 2. Follow-up-due nudges
  const dueFollowUps = await db
    .select({
      id: leads.id,
      orgId: leads.orgId,
      assignedTo: leads.assignedTo,
      contactName: leads.contactName,
      followUpAt: leads.followUpAt,
    })
    .from(leads)
    .where(
      and(
        isNotNull(leads.followUpAt),
        lte(leads.followUpAt, endOfToday),
        notInArray(leads.stage, ["booked", "lost"]),
      ),
    )
    .limit(NOTIFY_BATCH);

  for (const lead of dueFollowUps) {
    const profileId = lead.assignedTo ?? (await resolveOwnerId(lead.orgId));
    if (!profileId) continue;

    await notify({
      orgId: lead.orgId,
      profileId,
      kind: "follow_up_due",
      title: `Follow up with ${lead.contactName}`,
      body: `Follow-up was due ${lead.followUpAt!.toLocaleDateString()}.`,
      link: `/leads/${lead.id}`,
      sourceType: "lead",
      sourceId: lead.id,
    });
    results.followUpNudges += 1;
  }

  // 3. Stale-lead nudges — no update in org.staleLeadDays days, still active
  const activeLeads = await db
    .select({
      id: leads.id,
      orgId: leads.orgId,
      assignedTo: leads.assignedTo,
      contactName: leads.contactName,
      updatedAt: leads.updatedAt,
      staleLeadDays: organizations.staleLeadDays,
    })
    .from(leads)
    .innerJoin(organizations, eq(leads.orgId, organizations.id))
    .where(notInArray(leads.stage, ["booked", "lost"]))
    .limit(NOTIFY_BATCH);

  for (const lead of activeLeads) {
    const staleThreshold = new Date(now);
    staleThreshold.setDate(staleThreshold.getDate() - lead.staleLeadDays);
    if (lead.updatedAt > staleThreshold) continue;

    const profileId = lead.assignedTo ?? (await resolveOwnerId(lead.orgId));
    if (!profileId) continue;

    await notify({
      orgId: lead.orgId,
      profileId,
      kind: "stale_lead",
      title: `${lead.contactName} hasn't been touched in a while`,
      body: `No updates in ${lead.staleLeadDays}+ days — give them a nudge.`,
      link: `/leads/${lead.id}`,
      sourceType: "lead",
      sourceId: lead.id,
      dedupeWithinHours: lead.staleLeadDays * 24 - 4,
    });
    results.staleLeadNudges += 1;

    // Escalate to the owner once a lead has sat for twice the threshold —
    // skipped when the owner is already the one being nudged.
    const escalateThreshold = new Date(now);
    escalateThreshold.setDate(escalateThreshold.getDate() - lead.staleLeadDays * 2);
    const ownerId = await resolveOwnerId(lead.orgId);
    if (lead.updatedAt <= escalateThreshold && ownerId && ownerId !== profileId) {
      await notify({
        orgId: lead.orgId,
        profileId: ownerId,
        kind: "stale_lead",
        title: `${lead.contactName} has gone cold`,
        body: `No updates in ${lead.staleLeadDays * 2}+ days — the assigned teammate hasn't picked it up.`,
        link: `/leads/${lead.id}`,
        sourceType: "lead",
        sourceId: lead.id,
        dedupeWithinHours: lead.staleLeadDays * 24 - 4,
      });
      results.staleLeadEscalations += 1;
    }
  }

  // 4. Low-stock nudges — notify the owner, dedupe weekly (a restock reminder
  // firing every single day for the same low item would just get ignored)
  const lowStock = await db
    .select({
      id: stockItems.id,
      orgId: stockItems.orgId,
      name: stockItems.name,
      quantityOnHand: stockItems.quantityOnHand,
      lowStockThreshold: stockItems.lowStockThreshold,
      unit: stockItems.unit,
    })
    .from(stockItems)
    .where(sql`${stockItems.quantityOnHand} <= ${stockItems.lowStockThreshold}`)
    .limit(NOTIFY_BATCH);

  for (const item of lowStock) {
    const profileId = await resolveOwnerId(item.orgId);
    if (!profileId) continue;

    await notify({
      orgId: item.orgId,
      profileId,
      kind: "low_stock",
      title: `${item.name} is running low`,
      body: `${item.quantityOnHand} ${item.unit} left (alert threshold: ${item.lowStockThreshold}).`,
      link: `/inventory/${item.id}`,
      sourceType: "stock_item",
      sourceId: item.id,
      dedupeWithinHours: 24 * 7,
    });
    results.lowStockNudges += 1;
  }

  // 5. Unpaid invoices — sent/partial and older than org.invoiceReminderDays.
  // The owner gets an in-app notification (deduped weekly); the customer
  // gets a WhatsApp at most once per interval, when the org opted in.
  const unpaid = await db
    .select({
      id: invoices.id,
      orgId: invoices.orgId,
      number: invoices.number,
      contactName: invoices.contactName,
      contactPhone: invoices.contactPhone,
      customerId: invoices.customerId,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      publicToken: invoices.publicToken,
      createdAt: invoices.createdAt,
      lastReminderSentAt: invoices.lastReminderSentAt,
      reminderDays: organizations.invoiceReminderDays,
      reminderWhatsapp: organizations.invoiceReminderWhatsapp,
      orgName: organizations.name,
    })
    .from(invoices)
    .innerJoin(organizations, eq(invoices.orgId, organizations.id))
    .where(
      and(
        inArray(invoices.status, ["sent", "partial"]),
        sql`${invoices.createdAt} <= now() - make_interval(days => ${organizations.invoiceReminderDays})`,
      ),
    )
    .limit(NOTIFY_BATCH);

  let invoiceWhatsAppBudget = WHATSAPP_BATCH;
  for (const inv of unpaid) {
    const due = Number(inv.total) - Number(inv.amountPaid);
    if (due <= 0) continue;

    const ownerId = await resolveOwnerId(inv.orgId);
    if (ownerId) {
      await notify({
        orgId: inv.orgId,
        profileId: ownerId,
        kind: "invoice_overdue",
        title: `${inv.number} is unpaid`,
        body: `${inv.contactName} still owes ${formatCurrency(due)}.`,
        link: `/invoices/${inv.id}`,
        sourceType: "invoice",
        sourceId: inv.id,
        dedupeWithinHours: 24 * 7,
      });
      results.invoiceReminders += 1;
    }

    const intervalAgo = new Date(now);
    intervalAgo.setDate(intervalAgo.getDate() - inv.reminderDays);
    if (
      inv.reminderWhatsapp &&
      invoiceWhatsAppBudget > 0 &&
      (!inv.lastReminderSentAt || inv.lastReminderSentAt <= intervalAgo)
    ) {
      invoiceWhatsAppBudget -= 1;
      const link = `${getSiteUrl()}/invoice/${inv.publicToken}`;
      await sendWhatsApp({
        orgId: inv.orgId,
        to: inv.contactPhone,
        kind: "invoice_reminder",
        customerId: inv.customerId ?? undefined,
        body: `Hi ${inv.contactName}, a friendly reminder from ${inv.orgName}: ${formatCurrency(due)} is pending on invoice ${inv.number}. View and pay: ${link}`,
        templateParams: [inv.contactName, inv.orgName, formatCurrency(due), inv.number, link],
      });
      await db.update(invoices).set({ lastReminderSentAt: now }).where(eq(invoices.id, inv.id));
      results.invoiceWhatsApps += 1;
    }
  }

  // 6. Prune rate-limit windows older than a day
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, cutoff));

  return NextResponse.json(results);
}
