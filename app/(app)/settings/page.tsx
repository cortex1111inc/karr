import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { BillingSettingsForm } from "./billing-settings-form";
import { CopyLinkButton } from "@/components/ui/copy-link-button";

export default async function SettingsPage() {
  const user = await requireUser();

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const bookingUrl = `${getSiteUrl()}/book/${org.slug}`;

  return (
    <>
      <PageHeader title="Settings" description="Workspace-wide preferences." />
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Slot booking link</h2>
            <p className="mt-0.5 text-sm text-muted">
              Share this on Instagram, WhatsApp, or your website — anyone can request a booking without an account.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="break-all rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">{bookingUrl}</code>
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
                invoiceReminderDays={org.invoiceReminderDays}
                invoiceReminderWhatsapp={org.invoiceReminderWhatsapp}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Billing profile</h2>
            <p className="mt-0.5 text-sm text-muted">
              Printed on every quote and invoice. All optional — fill in GSTIN and state if you&apos;re GST-registered.
            </p>
            <div className="mt-4">
              <BillingSettingsForm
                profile={{
                  defaultGstRate: org.defaultGstRate,
                  legalName: org.legalName,
                  gstin: org.gstin,
                  billingAddress: org.billingAddress,
                  stateCode: org.stateCode,
                  logoUrl: org.logoUrl,
                  invoiceTerms: org.invoiceTerms,
                }}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Integrations</h2>
            <p className="mt-0.5 text-sm text-muted">Connect WhatsApp and other third-party services.</p>
            <Link href="/integrations" className="mt-3 inline-block text-sm font-medium text-accent-deep hover:underline">
              Manage integrations →
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Your account</h2>
            <p className="mt-0.5 text-sm text-muted">Your name, password, and signed-in devices.</p>
            <Link href="/settings/account" className="mt-3 inline-block text-sm font-medium text-accent-deep hover:underline">
              Manage account →
            </Link>
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
