import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { CampaignForm } from "./campaign-form";

export default async function CampaignsPage() {
  const user = await requireUser();

  const history = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.orgId, user.orgId))
    .orderBy(desc(campaigns.createdAt));

  return (
    <>
      <PageHeader title="Campaigns" description="Bring past customers back with a WhatsApp broadcast." />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">New campaign</h2>
            <div className="mt-4">
              <CampaignForm />
            </div>
          </Card>

          <Card className="divide-y divide-border">
            {history.length === 0 ? (
              <p className="p-5 text-sm text-faint">No campaigns sent yet.</p>
            ) : (
              history.map((campaign) => (
                <div key={campaign.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{campaign.name}</p>
                    <span className="font-mono text-xs tabular-nums text-faint">
                      {campaign.sentCount}/{campaign.audienceCount} sent
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{campaign.message}</p>
                  <p className="mt-2 font-mono text-[0.68rem] text-faint">
                    {campaign.createdAt.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
