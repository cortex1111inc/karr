import { and, desc, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { leadSourceEnum, leads, profiles, trackingLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PipelineBoard } from "./pipeline-board";
import { NewLeadDialog } from "./new-lead-dialog";
import { LeadFilters } from "./lead-filters";

export const metadata = { title: "Leads" };

// A board can't paginate the way a list does; cap it and ask for filters instead.
const BOARD_LIMIT = 300;

type SearchParams = {
  q?: string;
  source?: string;
  assignee?: string;
  from?: string;
  to?: string;
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const params = await searchParams;

  const conditions = [eq(leads.orgId, user.orgId)];

  if (params.q) {
    const term = `%${params.q}%`;
    conditions.push(
      or(ilike(leads.contactName, term), ilike(leads.contactPhone, term), ilike(leads.interest, term))!,
    );
  }
  if (params.source && (leadSourceEnum.enumValues as readonly string[]).includes(params.source)) {
    conditions.push(eq(leads.source, params.source as (typeof leadSourceEnum.enumValues)[number]));
  }
  if (params.assignee === "unassigned") {
    conditions.push(isNull(leads.assignedTo));
  } else if (params.assignee) {
    conditions.push(eq(leads.assignedTo, params.assignee));
  }
  if (params.from) {
    conditions.push(gte(leads.createdAt, new Date(params.from)));
  }
  if (params.to) {
    const to = new Date(params.to);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(leads.createdAt, to));
  }

  const [fetchedLeads, orgProfiles, activeLinks] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt))
      .limit(BOARD_LIMIT + 1),
    db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).where(eq(profiles.orgId, user.orgId)),
    db
      .select({ id: trackingLinks.id, name: trackingLinks.name })
      .from(trackingLinks)
      .where(and(eq(trackingLinks.orgId, user.orgId), isNull(trackingLinks.archivedAt))),
  ]);

  const truncated = fetchedLeads.length > BOARD_LIMIT;
  const orgLeads = truncated ? fetchedLeads.slice(0, BOARD_LIMIT) : fetchedLeads;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every enquiry, in one pipeline."
        action={
          <div className="flex items-center gap-3">
            <a href="/api/export/leads" className="text-sm font-medium text-accent-deep hover:underline">
              Export CSV
            </a>
            <NewLeadDialog links={activeLinks} />
          </div>
        }
      />
      <div className="border-b border-border bg-surface px-4 sm:px-6 lg:px-8 py-4">
        <LeadFilters profiles={orgProfiles} initial={params} />
      </div>
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {truncated ? (
          <p className="mb-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
            Showing the {BOARD_LIMIT} most recent leads. Use search or filters to find older ones.
          </p>
        ) : null}
        <PipelineBoard leads={orgLeads} />
      </div>
    </>
  );
}
