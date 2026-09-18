import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();

  const rows = await db
    .select({
      contactName: leads.contactName,
      contactPhone: leads.contactPhone,
      interest: leads.interest,
      source: leads.source,
      stage: leads.stage,
      assignee: profiles.fullName,
      followUpAt: leads.followUpAt,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .leftJoin(profiles, eq(leads.assignedTo, profiles.id))
    .where(eq(leads.orgId, user.orgId))
    .orderBy(desc(leads.createdAt));

  const csv = toCsv(rows, [
    { key: "contactName", label: "Name" },
    { key: "contactPhone", label: "Phone" },
    { key: "interest", label: "Enquiry" },
    { key: "source", label: "Source" },
    { key: "stage", label: "Stage" },
    { key: "assignee", label: "Assigned to" },
    { key: "followUpAt", label: "Follow-up date" },
    { key: "createdAt", label: "Created" },
  ]);

  return csvResponse("leads.csv", csv);
}
