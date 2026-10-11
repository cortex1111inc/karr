import { requireUser } from "@/lib/auth";
import { getSetupStatus, serverConfig } from "@/lib/guide";
import { getSiteUrl } from "@/lib/site";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { FlowSimulator } from "./flow-simulator";
import { FeatureExplorer } from "./feature-explorer";
import { SetupChecklist } from "./setup-checklist";
import { GuideTabs, type GuideTab } from "./guide-tabs";

export const metadata = { title: "Guide" };

const TAB_IDS: GuideTab[] = ["flow", "features", "setup"];

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const initial = TAB_IDS.find((t) => t === tab) ?? "flow";
  const isOwner = user.role === "owner";

  const [done, [org]] = await Promise.all([
    getSetupStatus(user.orgId),
    db.select({ slug: organizations.slug }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1),
  ]);
  const site = getSiteUrl();

  return (
    <>
      <PageHeader
        title="Guide"
        description="See how a job moves through the product, what each part does, and what to set up."
      />
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <GuideTabs
          initial={initial}
          flow={<FlowSimulator />}
          features={<FeatureExplorer isOwner={isOwner} />}
          setup={
            <SetupChecklist
              done={done}
              isOwner={isOwner}
              bookingUrl={`${site}/book/${org.slug}`}
              serverChecks={isOwner ? serverConfig() : []}
              webhooks={
                isOwner
                  ? [
                      {
                        label: "Razorpay",
                        url: `${site}/api/webhooks/razorpay/${user.orgId}`,
                        where: "Razorpay Dashboard → Webhooks → Add. Choose the payment_link.paid event and set a secret, then save the same secret on Integrations.",
                      },
                    ]
                  : []
              }
            />
          }
        />
      </div>
    </>
  );
}
