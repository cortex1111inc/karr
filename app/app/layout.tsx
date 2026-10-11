import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [unread] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.profileId, user.id), isNull(notifications.readAt)));

  return (
    <AppShell user={{ fullName: user.fullName, email: user.email }} unreadCount={unread?.value ?? 0}>
      <ToastProvider>{children}</ToastProvider>
    </AppShell>
  );
}
