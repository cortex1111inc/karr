import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { isInterState, isStateCode, isValidGstin } from "@/lib/billing/gst";

export type GstFields = { placeOfSupply: string | null; customerGstin: string | null; interState: boolean };

// Reads the optional GST fields shared by the quotation and invoice forms.
// A customer GSTIN implies its state as place of supply when none is picked.
export async function readGstFields(orgId: string, formData: FormData): Promise<GstFields | { error: string }> {
  const gstin = String(formData.get("customerGstin") ?? "").trim().toUpperCase() || null;
  let pos = String(formData.get("placeOfSupply") ?? "").trim() || null;

  if (gstin && !isValidGstin(gstin)) return { error: "That customer GSTIN doesn't look right (15 characters, e.g. 32ABCDE1234F1Z5)." };
  if (pos && !isStateCode(pos)) return { error: "Pick a valid place of supply." };
  if (!pos && gstin) pos = gstin.slice(0, 2);

  const [org] = await db.select({ stateCode: organizations.stateCode }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return { placeOfSupply: pos, customerGstin: gstin, interState: isInterState(org?.stateCode, pos) };
}
