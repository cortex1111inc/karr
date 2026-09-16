import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PipelineBoard } from "./pipeline-board";
import { NewLeadDialog } from "./new-lead-dialog";

export default async function LeadsPage() {
  const user = await requireUser();

  const orgLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.orgId, user.orgId))
    .orderBy(desc(leads.createdAt));

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every enquiry, in one pipeline."
        action={<NewLeadDialog />}
      />
      <div className="flex-1 overflow-x-auto px-8 py-6">
        <PipelineBoard leads={orgLeads} />
      </div>
    </>
  );
}
