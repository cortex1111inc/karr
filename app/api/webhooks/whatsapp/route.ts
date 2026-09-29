import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { integrations, leadActivities, leads, profiles, whatsappMessages } from "@/db/schema";
import { recordStageChange } from "@/lib/lead-stage";
import { notify } from "@/lib/notifications";
import { generatePublicToken } from "@/lib/tokens";
import { parseWhatsAppWebhook, phoneKey, verifyMetaSignature } from "@/lib/whatsapp/webhook";

// Meta WhatsApp Cloud API webhook (configured once per Meta app, so the
// verify token and app secret are env vars, not per-org). Messages are
// routed to an org by the receiving phone_number_id saved on /integrations.
//
// GET  — subscription handshake (hub.verify_token must match WHATSAPP_VERIFY_TOKEN)
// POST — inbound messages → new lead or activity on an open lead;
//        delivery statuses → whatsapp_messages.status

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === token) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  // Without the secret we can't authenticate the sender — refuse rather
  // than let anyone create leads.
  if (!appSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await request.text();
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const { messages, statuses } = parseWhatsAppWebhook(payload);

  for (const s of statuses) {
    // "sent" is what we already recorded; skipping it also avoids an
    // out-of-order delivery overwriting a later delivered/read.
    if (s.status === "sent") continue;
    await db
      .update(whatsappMessages)
      .set({ status: s.status, ...(s.error ? { error: s.error } : {}) })
      .where(eq(whatsappMessages.providerMessageId, s.providerMessageId));
  }

  if (messages.length) {
    const numberIds = [...new Set(messages.map((m) => m.phoneNumberId))];
    const orgRows = await db
      .select({ orgId: integrations.orgId, phoneNumberId: integrations.phoneNumberId })
      .from(integrations)
      .where(and(eq(integrations.provider, "whatsapp"), inArray(integrations.phoneNumberId, numberIds)));
    const orgByNumber = new Map(orgRows.map((r) => [r.phoneNumberId, r.orgId]));

    for (const m of messages) {
      const orgId = orgByNumber.get(m.phoneNumberId);
      if (!orgId) continue; // shared/env number, or not connected — nothing to route to
      await handleInbound(orgId, m.from, m.name, m.text);
    }
  }

  // Always 200 once authenticated, or Meta retries the delivery.
  return NextResponse.json({ ok: true });
}

async function handleInbound(orgId: string, from: string, name: string | null, text: string) {
  const key = phoneKey(from);
  const [open] = await db
    .select({ id: leads.id, assignedTo: leads.assignedTo, contactName: leads.contactName })
    .from(leads)
    .where(
      and(
        eq(leads.orgId, orgId),
        notInArray(leads.stage, ["booked", "lost"]),
        sql`right(regexp_replace(${leads.contactPhone}, '\\D', '', 'g'), 10) = ${key}`,
      ),
    )
    .orderBy(desc(leads.updatedAt))
    .limit(1);

  const [owner] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.orgId, orgId), eq(profiles.role, "owner")))
    .limit(1);

  if (open) {
    await db.insert(leadActivities).values({ leadId: open.id, kind: "whatsapp", body: `Customer: ${text.slice(0, 2000)}` });
    await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, open.id));
    const to = open.assignedTo ?? owner?.id;
    if (to) {
      await notify({
        orgId,
        profileId: to,
        kind: "system",
        title: `New WhatsApp from ${open.contactName}`,
        body: text.slice(0, 200),
        link: `/leads/${open.id}`,
      });
    }
    return;
  }

  const [lead] = await db
    .insert(leads)
    .values({
      orgId,
      contactName: name?.slice(0, 100) || from,
      contactPhone: from,
      interest: text.slice(0, 500),
      source: "whatsapp",
      publicToken: generatePublicToken(),
    })
    .returning({ id: leads.id });
  await recordStageChange({ orgId, leadId: lead.id, from: null, to: "new", changedBy: null });
  await db.insert(leadActivities).values({ leadId: lead.id, kind: "whatsapp", body: `Customer: ${text.slice(0, 2000)}` });

  if (owner) {
    await notify({
      orgId,
      profileId: owner.id,
      kind: "system",
      title: `New WhatsApp lead: ${name ?? from}`,
      body: text.slice(0, 200),
      link: `/leads/${lead.id}`,
    });
  }
}
