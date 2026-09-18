import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNotNull, isNull, lte, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { customers, leads, organizations, profiles } from "@/db/schema";
import { sendWhatsApp } from "@/lib/whatsapp";
import { renderReminderMessage } from "@/lib/whatsapp/templates";
import { notify } from "@/lib/notifications";

// Single consolidated daily job (Vercel Cron, see vercel.json) — kept as one
// route rather than one-per-concern so the project stays within a free-tier
// cron-job quota. Handles:
//   1. Service/rental retention reminders (WhatsApp)
//   2. In-app "follow-up due" nudges for leads
//   3. In-app "stale lead" nudges (no update in org.staleLeadDays days)
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
    );

  for (const customer of dueForService) {
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + customer.serviceIntervalDays);

    await sendWhatsApp({
      orgId: customer.orgId,
      to: customer.phone,
      kind: "service_reminder",
      customerId: customer.customerId,
      body: renderReminderMessage(customer.reminderMessage, customer.fullName),
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
    );

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
    .where(notInArray(leads.stage, ["booked", "lost"]));

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
  }

  return NextResponse.json(results);
}
