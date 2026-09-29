import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { NameForm, NotificationPrefsForm, PasswordChangeForm, SignOutEverywhereButton } from "./account-forms";

export default async function AccountPage() {
  const user = await requireUser();
  const [profile] = await db
    .select({ phone: profiles.phone, muted: profiles.mutedNotificationKinds })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return (
    <>
      <PageHeader
        title="Your account"
        description={
          <Link href="/settings" className="text-sm text-muted hover:text-foreground">
            ← Settings
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold">Profile</h2>
          <p className="mt-0.5 text-sm text-muted">
            Signed in as <span className="font-medium text-foreground">{user.email}</span> · {user.role === "owner" ? "Owner" : "Staff"}
          </p>
          <div className="mt-4">
            <NameForm fullName={user.fullName} phone={profile?.phone ?? null} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold">Notifications</h2>
          <p className="mt-0.5 text-sm text-muted">Choose which in-app reminders you get.</p>
          <div className="mt-4">
            <NotificationPrefsForm muted={profile?.muted ?? []} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold">Password</h2>
          <div className="mt-4">
            <PasswordChangeForm />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold">Sessions</h2>
          <p className="mt-0.5 text-sm text-muted">Lost a phone, or signed in on a shared computer? Sign out of every device at once.</p>
          <div className="mt-3">
            <SignOutEverywhereButton />
          </div>
        </Card>
      </div>
    </>
  );
}
