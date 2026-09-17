import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { leadActivities, leads, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditLeadForm } from "./edit-lead-form";
import { AssigneeSelect } from "./assignee-select";
import { ActivityTimeline } from "./activity-timeline";
import { ConvertDialog } from "./convert-dialog";
import { NotifyReadyButton } from "./notify-ready-button";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.orgId, user.orgId)))
    .limit(1);

  if (!lead) notFound();

  const [orgProfiles, activities] = await Promise.all([
    db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).where(eq(profiles.orgId, user.orgId)),
    db
      .select({
        id: leadActivities.id,
        kind: leadActivities.kind,
        body: leadActivities.body,
        createdAt: leadActivities.createdAt,
        authorName: profiles.fullName,
      })
      .from(leadActivities)
      .leftJoin(profiles, eq(leadActivities.authorId, profiles.id))
      .where(eq(leadActivities.leadId, id))
      .orderBy(desc(leadActivities.createdAt)),
  ]);

  return (
    <>
      <PageHeader
        title={lead.contactName}
        description={
          <Link href="/leads" className="text-sm text-muted hover:text-foreground">
            ← Back to pipeline
          </Link>
        }
        action={
          lead.customerId ? (
            <div className="flex items-center gap-3">
              <NotifyReadyButton leadId={lead.id} />
              <Badge tone="accent">Converted to customer</Badge>
            </div>
          ) : (
            <ConvertDialog leadId={lead.id} contactName={lead.contactName} contactPhone={lead.contactPhone} />
          )
        }
      />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Lead details</h2>
              <EditLeadForm lead={lead} />
            </Card>
            <ActivityTimeline leadId={lead.id} activities={activities} />
          </div>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Assigned to</h2>
              <div className="mt-3">
                <AssigneeSelect leadId={lead.id} profiles={orgProfiles} currentAssigneeId={lead.assignedTo} />
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Timeline</h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Created</dt>
                  <dd className="font-mono text-xs tabular-nums">{lead.createdAt.toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Updated</dt>
                  <dd className="font-mono text-xs tabular-nums">{lead.updatedAt.toLocaleDateString()}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
