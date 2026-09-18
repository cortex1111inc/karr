import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppForm } from "./whatsapp-form";
import { DisconnectButton } from "./disconnect-button";

export default async function IntegrationsPage() {
  const user = await requireUser();

  const [whatsapp] = await db
    .select({ phoneNumberId: integrations.phoneNumberId, connectedAt: integrations.connectedAt })
    .from(integrations)
    .where(and(eq(integrations.orgId, user.orgId), eq(integrations.provider, "whatsapp")))
    .limit(1);

  const orgConnected = Boolean(whatsapp?.connectedAt);
  const envFallbackConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

  const status = orgConnected ? "connected" : envFallbackConfigured ? "shared" : "none";

  return (
    <>
      <PageHeader title="Integrations" description="Connect third-party services — no code, no redeploys." />
      <div className="flex-1 px-8 py-6">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-bold">WhatsApp Business</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Powers booking confirmations, ready-for-pickup alerts, service reminders, and campaigns.
                </p>
              </div>
              <Badge tone={status === "connected" ? "accent" : status === "shared" ? "neutral" : "neutral"}>
                {status === "connected" ? "Connected" : status === "shared" ? "Using shared default" : "Not connected"}
              </Badge>
            </div>

            {status === "shared" ? (
              <p className="mt-3 text-sm text-muted">
                This workspace is currently sending through a shared fallback account. Connect your own number below to
                take over — your credentials always take priority once saved.
              </p>
            ) : null}

            {user.role === "owner" ? (
              <>
                <WhatsAppForm phoneNumberId={whatsapp?.phoneNumberId ?? null} isConnected={orgConnected} />
                {orgConnected ? (
                  <div className="mt-3">
                    <DisconnectButton />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm text-faint">Only the workspace owner can connect or change this integration.</p>
            )}

            <p className="mt-4 border-t border-border pt-3 text-xs text-faint">
              Need credentials?{" "}
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noreferrer"
                className="text-accent-deep hover:underline"
              >
                WhatsApp Cloud API setup guide ↗
              </a>
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">More integrations</h2>
            <p className="mt-0.5 text-sm text-muted">
              Email and SMS alerts aren&apos;t connected yet — ask and we&apos;ll add a card here once there&apos;s a
              provider to wire up.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
