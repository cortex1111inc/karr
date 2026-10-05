import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { NotificationRow } from "./notification-row";
import { MarkAllReadButton } from "./mark-all-read-button";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const page = parsePage((await searchParams).page);

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.profileId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(notifications).where(eq(notifications.profileId, user.id)),
  ]);

  return (
    <>
      <PageHeader title="Notifications" description="Follow-ups, stale leads, and reminders that need your attention." action={<MarkAllReadButton />} />
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        <Card className="divide-y divide-border">
          {items.length === 0 ? (
            <p className="p-5 text-sm text-faint">You&apos;re all caught up. Follow-up reminders, stale leads and low-stock alerts land here.</p>
          ) : (
            items.map((notification) => <NotificationRow key={notification.id} notification={notification} />)
          )}
        </Card>
        <Pagination page={page} total={total} pathname="/notifications" />
      </div>
    </>
  );
}
