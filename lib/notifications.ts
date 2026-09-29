import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { notifications, notificationKindEnum, profiles } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";
import { sendWhatsApp } from "@/lib/whatsapp";

export type NotifyInput = {
  orgId: string;
  profileId: string;
  kind: (typeof notificationKindEnum.enumValues)[number];
  title: string;
  body: string;
  link?: string;
  sourceType?: string;
  sourceId?: string;
  dedupeWithinHours?: number;
};

// Creates an in-app notification, skipping it if one of the same
// kind+source was already created within `dedupeWithinHours` (default 20 —
// just under a day, so a daily cron never double-notifies for the same
// still-true condition on consecutive runs).
export async function notify(input: NotifyInput) {
  // Respect the recipient's muted kinds (set on /settings/account).
  const [recipient] = await db
    .select({
      muted: profiles.mutedNotificationKinds,
      channels: profiles.alertChannels,
      email: profiles.email,
      phone: profiles.phone,
    })
    .from(profiles)
    .where(eq(profiles.id, input.profileId))
    .limit(1);
  if (!recipient || recipient.muted.includes(input.kind)) return;

  if (input.sourceType && input.sourceId) {
    const since = new Date();
    since.setHours(since.getHours() - (input.dedupeWithinHours ?? 20));

    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.sourceType, input.sourceType),
          eq(notifications.sourceId, input.sourceId),
          eq(notifications.kind, input.kind),
          eq(notifications.profileId, input.profileId),
          gte(notifications.createdAt, since),
        ),
      )
      .limit(1);

    if (existing) return;
  }

  await db.insert(notifications).values({
    orgId: input.orgId,
    profileId: input.profileId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    link: input.link,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  });

  // Fan out to the extra channels the recipient opted into on /settings/account.
  const link = input.link ? `${getSiteUrl()}${input.link}` : null;
  const details = [input.body, link].filter(Boolean).join(" ");
  if (recipient.channels.includes("email")) {
    await sendEmail({
      orgId: input.orgId,
      kind: `alert:${input.kind}`,
      to: recipient.email,
      subject: input.title,
      text: [input.body, link].filter(Boolean).join("\n\n"),
    });
  }
  if (recipient.channels.includes("whatsapp") && recipient.phone) {
    await sendWhatsApp({
      orgId: input.orgId,
      to: recipient.phone,
      kind: "staff_alert",
      body: `${input.title}\n${details}`,
      templateParams: [input.title, details],
    });
  }
}
