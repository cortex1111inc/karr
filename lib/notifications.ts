import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { notifications, notificationKindEnum } from "@/db/schema";

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
}
