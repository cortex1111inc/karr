import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { customers, organizations } from "@/db/schema";
import { sendWhatsApp } from "@/lib/whatsapp";
import { renderReminderMessage } from "@/lib/whatsapp/templates";

// Runs daily via Vercel Cron (see vercel.json). Finds customers whose
// service/rental is due and sends a retention reminder, then rolls
// nextServiceDueAt forward so the same customer doesn't get reminded again
// until the next interval.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  const due = await db
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

  let sent = 0;
  for (const customer of due) {
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

    sent += 1;
  }

  return NextResponse.json({ sent });
}
