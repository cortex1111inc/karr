import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "./settings-form";
import { CopyLinkButton } from "./copy-link-button";

export default async function SettingsPage() {
  const user = await requireUser();

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const whatsappConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  const bookingUrl = `${getSiteUrl()}/book/${org.slug}`;

  return (
    <>
      <PageHeader title="Settings" description="Workspace-wide preferences." />
      <div className="flex-1 px-8 py-6">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Slot booking link</h2>
            <p className="mt-0.5 text-sm text-muted">
              Share this on Instagram, WhatsApp, or your website — anyone can request a booking without an account.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">{bookingUrl}</code>
              <CopyLinkButton url={bookingUrl} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Retention &amp; follow-up automation</h2>
            <p className="mt-0.5 text-sm text-muted">
              When customers get a service reminder, and when staff get nudged about leads going quiet.
            </p>
            <div className="mt-4">
              <SettingsForm
                serviceIntervalDays={org.serviceIntervalDays}
                reminderMessage={org.reminderMessage}
                staleLeadDays={org.staleLeadDays}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">WhatsApp</h2>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={whatsappConfigured ? "accent" : "neutral"}>
                {whatsappConfigured ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              {whatsappConfigured
                ? "Messages send via the WhatsApp Cloud API."
                : "No WhatsApp credentials set — messages are logged instead of sent. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to go live (see .env.example)."}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Team</h2>
            <p className="mt-0.5 text-sm text-muted">Manage who has access to this workspace.</p>
            <Link href="/settings/team" className="mt-3 inline-block text-sm font-medium text-accent-deep hover:underline">
              Manage team →
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
