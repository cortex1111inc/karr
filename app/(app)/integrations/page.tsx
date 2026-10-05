import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { EmailSettings, RazorpaySettings, WhatsAppSettings } from "@/lib/integrations";
import { getSiteUrl } from "@/lib/site";
import { TEMPLATE_KINDS } from "@/lib/whatsapp";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisconnectButton, EmailForm, RazorpayForm, TemplatesForm, TestButton, WhatsAppForm } from "./integration-forms";

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
  const whatsapp = byProvider.get("whatsapp");
  const email = byProvider.get("email");
  const razorpay = byProvider.get("razorpay");

  const waStatus: Status = whatsapp?.connectedAt
    ? "connected"
    : process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
      ? "shared"
      : "none";
  const emailStatus: Status = email?.connectedAt ? "connected" : process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "shared" : "none";
  const payStatus: Status = razorpay?.connectedAt ? "connected" : "none";

  const templates = (whatsapp?.settings as WhatsAppSettings | undefined)?.templates ?? {};
  const templateRows = TEMPLATE_KINDS.map((t) => ({
    kind: t.kind,
    label: t.label,
    variables: t.variables,
    example: t.example,
    name: templates[t.kind]?.name ?? "",
    language: templates[t.kind]?.language ?? "en",
  }));

  const ownerOnly = <p className="text-sm text-faint">Only the workspace owner can connect or change this integration.</p>;

  return (
    <>
      <PageHeader title="Integrations" description="Connect third-party services — no code, no redeploys." />
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <IntegrationCard
            title="WhatsApp Business"
            powers="Booking confirmations, pickup alerts, service & invoice reminders, campaigns, staff alerts — and inbound messages become leads."
            status={waStatus}
            footer={
              <>
                <Guide href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started">Cloud API setup guide</Guide>
                <span className="mt-1 block">
                  Inbound webhook (set once on your Meta app): <code className="break-all">{getSiteUrl()}/api/webhooks/whatsapp</code>
                </span>
              </>
            }
          >
            {waStatus === "shared" ? (
              <p className="mb-3 text-sm text-muted">Sending through a shared fallback account. Connect your own number to take over.</p>
            ) : null}
            {isOwner ? (
              <>
                <WhatsAppForm phoneNumberId={whatsapp?.phoneNumberId ?? null} isConnected={Boolean(whatsapp?.connectedAt)} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <TestButton channel="whatsapp" />
                  {whatsapp?.connectedAt ? <DisconnectButton provider="whatsapp" /> : null}
                </div>
              </>
            ) : (
              ownerOnly
            )}
          </IntegrationCard>

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
                  <TestButton channel="email" />
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

          {isOwner && whatsapp?.connectedAt ? (
            <Card className="p-5 xl:col-span-2">
              <h2 className="font-display text-sm font-bold">WhatsApp message templates</h2>
              <div className="mt-3">
                <TemplatesForm rows={templateRows} />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
