import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import type { DocumentOrg } from "@/components/billing/document-view";

export async function documentOrg(orgId: string): Promise<DocumentOrg> {
  const [org] = await db
    .select({
      name: organizations.name,
      legalName: organizations.legalName,
      gstin: organizations.gstin,
      billingAddress: organizations.billingAddress,
      stateCode: organizations.stateCode,
      logoUrl: organizations.logoUrl,
      invoiceTerms: organizations.invoiceTerms,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org;
}
