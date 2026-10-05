import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { leads, profiles, trackingLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { parseDateRange } from "@/lib/reports";

// Full export by default; ?from=&to= (YYYY-MM-DD, by created date) is an
// additional filtered option used from /reports.
export async function GET(request: Request) {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const range = parseDateRange(params.get("from"), params.get("to"));
  if ("error" in range) return new Response(range.error, { status: 400 });

  const where: SQL[] = [eq(leads.orgId, user.orgId)];
  if (range.from) where.push(gte(leads.createdAt, range.from));
  if (range.to) where.push(lte(leads.createdAt, range.to));

  const rows = await db
    .select({
      contactName: leads.contactName,
      contactPhone: leads.contactPhone,
      interest: leads.interest,
      source: leads.source,
      stage: leads.stage,
      assignee: profiles.fullName,
      trackingLink: trackingLinks.name,
      followUpAt: leads.followUpAt,
      rentalStart: leads.rentalStart,
      rentalEnd: leads.rentalEnd,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .leftJoin(profiles, eq(leads.assignedTo, profiles.id))
    .leftJoin(trackingLinks, eq(leads.trackingLinkId, trackingLinks.id))
    .where(and(...where))
    .orderBy(desc(leads.createdAt));

  const csv = toCsv(rows, [
    { key: "contactName", label: "Name" },
    { key: "contactPhone", label: "Phone" },
    { key: "interest", label: "Enquiry" },
    { key: "source", label: "Source" },
    { key: "stage", label: "Stage" },
    { key: "assignee", label: "Assigned to" },
    { key: "trackingLink", label: "Tracking link" },
    { key: "followUpAt", label: "Follow-up date" },
    { key: "rentalStart", label: "Rental from" },
    { key: "rentalEnd", label: "Rental until" },
    { key: "createdAt", label: "Created" },
  ]);

  const suffix = range.from || range.to ? `-${params.get("from") ?? "start"}-to-${params.get("to") ?? "now"}` : "";
  return csvResponse(`leads${suffix}.csv`, csv);
}
