import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";
import { RemoveButton } from "./remove-button";

export default async function TeamPage() {
  const user = await requireUser();

  const orgProfiles = await db.select().from(profiles).where(eq(profiles.orgId, user.orgId));

  return (
    <>
      <PageHeader title="Team" description="Who has access to this workspace." />
      <div className="flex-1 px-8 py-6">
        {user.role === "owner" ? (
          <Card className="mb-6 p-5">
            <h2 className="font-display text-sm font-bold">Invite a teammate</h2>
            <p className="mt-0.5 text-sm text-muted">They&apos;ll get an email invite to set their password.</p>
            <div className="mt-4">
              <InviteForm />
            </div>
          </Card>
        ) : null}

        <Card className="divide-y divide-border">
          {orgProfiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold">
                  {profile.fullName} {profile.id === user.id ? <span className="text-faint">(you)</span> : null}
                </p>
                <p className="text-xs text-muted">{profile.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={profile.role === "owner" ? "accent" : "neutral"}>{profile.role}</Badge>
                {user.role === "owner" && profile.id !== user.id ? (
                  <RemoveButton profileId={profile.id} fullName={profile.fullName} />
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
