"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function markNotificationRead(notificationId: string) {
  const user = await requireUser();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.profileId, user.id)));

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.profileId, user.id), isNull(notifications.readAt)));

  revalidatePath("/notifications");
}
