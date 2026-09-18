import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { NotificationRow } from "./notification-row";
import { MarkAllReadButton } from "./mark-all-read-button";

export default async function NotificationsPage() {
  const user = await requireUser();

  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.profileId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <>
      <PageHeader title="Notifications" description="Follow-ups, stale leads, and reminders that need your attention." action={<MarkAllReadButton />} />
      <div className="flex-1 px-8 py-6">
        <Card className="divide-y divide-border">
          {items.length === 0 ? (
            <p className="p-5 text-sm text-faint">Nothing here yet.</p>
          ) : (
            items.map((notification) => <NotificationRow key={notification.id} notification={notification} />)
          )}
        </Card>
      </div>
    </>
  );
}
