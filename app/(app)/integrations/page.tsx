import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { EmailSettings, RazorpaySettings } from "@/lib/integrations";
import { getSiteUrl } from "@/lib/site";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisconnectButton, EmailForm, RazorpayForm, TestButton } from "./integration-forms";

export const metadata = { title: "Integrations" };

type Status = "connected" | "shared" | "none";

function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge tone={status === "connected" ? "accent" : "neutral"}>
      {status === "connected" ? "Connected" : status === "shared" ? "Using shared default" : "Not connected"}
    </Badge>
  );
}

function IntegrationCard({
  title,
  powers,
  status,
  children,
  footer,
}: {
  title: string;
  powers: string;
  status: Status;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{powers}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 flex-1">{children}</div>
      <div className="mt-4 border-t border-border pt-3 text-xs text-faint">{footer}</div>
    </Card>
  );
}

function Guide({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent-deep hover:underline">
      {children} ↗
    </a>
  );
}

export default async function IntegrationsPage() {
  const user = await requireUser();
  const isOwner = user.role === "owner";

  const rows = await db
    .select({
      provider: integrations.provider,
      phoneNumberId: integrations.phoneNumberId,
      settings: integrations.settings,
      connectedAt: integrations.connectedAt,
    })
    .from(integrations)
    .where(eq(integrations.orgId, user.orgId));
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const email = byProvider.get("email");
  const razorpay = byProvider.get("razorpay");

  const emailStatus: Status = email?.connectedAt ? "connected" : process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "shared" : "none";
  const payStatus: Status = razorpay?.connectedAt ? "connected" : "none";

  const ownerOnly = <p className="text-sm text-faint">Only the workspace owner can connect or change this integration.</p>;

  return (
    <>
      <PageHeader title="Integrations" description="Connect third-party services — no code, no redeploys." />
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IntegrationCard
            title="Email"
            powers="Emailing quotes and invoices to customers, and email copies of staff alerts."
            status={emailStatus}
            footer={<Guide href="https://resend.com/docs/dashboard/domains/introduction">Verify a sending domain in Resend</Guide>}
          >
            {isOwner ? (
              <>
                <EmailForm fromAddress={(email?.settings as EmailSettings | undefined)?.fromAddress ?? null} isConnected={Boolean(email?.connectedAt)} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <TestButton />
                  {email?.connectedAt ? <DisconnectButton provider="email" /> : null}
                </div>
              </>
            ) : (
              ownerOnly
            )}
          </IntegrationCard>

          <IntegrationCard
            title="Online payments (Razorpay)"
            powers="A Pay now button on invoice links — UPI, cards, netbanking — recorded against the invoice automatically."
            status={payStatus}
            footer={<Guide href="https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/">Where to find your API keys</Guide>}
          >
            {isOwner ? (
              <>
                <RazorpayForm
                  keyId={(razorpay?.settings as RazorpaySettings | undefined)?.keyId ?? null}
                  isConnected={Boolean(razorpay?.connectedAt)}
                  webhookUrl={`${getSiteUrl()}/api/webhooks/razorpay/${user.orgId}`}
                />
                {razorpay?.connectedAt ? (
                  <div className="mt-3">
                    <DisconnectButton provider="razorpay" />
                  </div>
                ) : null}
              </>
            ) : (
              ownerOnly
            )}
          </IntegrationCard>

        </div>
      </div>
    </>
  );
}
