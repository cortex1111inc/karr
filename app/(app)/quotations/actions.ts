"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { leads, quotationItems, quotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { readGstFields } from "@/lib/billing/gst-fields";
import { createInvoiceRecord, ownedStockItemIds } from "@/lib/billing/invoices";
import { calculateTotals } from "@/lib/billing/money";
import { nextDocumentNumber } from "@/lib/billing/numbering";
import { parseLineItems } from "@/lib/billing/schema";
import { generatePublicToken } from "@/lib/tokens";
import { changeLeadStage } from "@/lib/lead-stage";
import { ownedCustomerId, ownedLeadId } from "@/lib/org-refs";

const quotationSchema = z.object({
  contactName: z.string().trim().min(1, "Name is required"),
  contactPhone: z.string().trim().min(1, "Phone is required"),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  gstEnabled: z.coerce.boolean(),
  gstRate: z.coerce.number().min(0).max(100),
  leadId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  customerId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function createQuotation(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = quotationSchema.safeParse({
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    notes: formData.get("notes"),
    gstEnabled: formData.get("gstEnabled") === "true",
    gstRate: formData.get("gstRate"),
    leadId: formData.get("leadId"),
    customerId: formData.get("customerId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const items = parseLineItems(formData.get("itemsJson"));
  if (!items.success) {
    return { error: items.error };
  }

  const gst = await readGstFields(user.orgId, formData);
  if ("error" in gst) return { error: gst.error };

  const totals = calculateTotals(items.data, parsed.data.gstEnabled, parsed.data.gstRate);
  const [leadId, customerId, lines] = await Promise.all([
    ownedLeadId(user.orgId, parsed.data.leadId),
    ownedCustomerId(user.orgId, parsed.data.customerId),
    ownedStockItemIds(user.orgId, items.data),
  ]);
  const number = await nextDocumentNumber(user.orgId, "quotation");

  const [quotation] = await db
    .insert(quotations)
    .values({
      orgId: user.orgId,
      leadId,
      customerId,
      number,
      contactName: parsed.data.contactName,
      contactPhone: parsed.data.contactPhone,
      notes: parsed.data.notes,
      gstEnabled: parsed.data.gstEnabled,
      gstRate: parsed.data.gstEnabled ? parsed.data.gstRate : 0,
      placeOfSupply: gst.placeOfSupply,
      customerGstin: gst.customerGstin,
      interState: parsed.data.gstEnabled && gst.interState,
      subtotal: totals.subtotal.toString(),
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
      publicToken: generatePublicToken(),
      createdBy: user.id,
    })
    .returning({ id: quotations.id });

  await db.insert(quotationItems).values(
    lines.map((item, index) => ({
      quotationId: quotation.id,
      description: item.description,
      hsnSac: item.hsnSac,
      stockItemId: item.stockItemId,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (Math.round(item.quantity * item.unitPrice * 100) / 100).toString(),
      sortOrder: index,
    })),
  );

  // Quoting a lead that's still new/contacted moves it along the pipeline.
  if (leadId) {
    const [lead] = await db
      .select({ stage: leads.stage })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)))
      .limit(1);
    if (lead && (lead.stage === "new" || lead.stage === "contacted")) {
      await changeLeadStage({ orgId: user.orgId, leadId, to: "quoted", changedBy: user.id });
      revalidatePath("/leads");
    }
  }

  revalidatePath("/quotations");
  redirect(`/quotations/${quotation.id}`);
}

export async function updateQuotationStatus(
  quotationId: string,
  status: "draft" | "sent" | "accepted" | "declined",
) {
  const user = await requireUser();

  await db
    .update(quotations)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(quotations.id, quotationId), eq(quotations.orgId, user.orgId)));

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
}

export async function deleteQuotation(quotationId: string) {
  const user = await requireUser();

  await db
    .delete(quotations)
    .where(and(eq(quotations.id, quotationId), eq(quotations.orgId, user.orgId), eq(quotations.status, "draft")));

  revalidatePath("/quotations");
}

// Goes through createInvoiceRecord so linked stock is decremented exactly as
// for a hand-made invoice. Returns an error (e.g. out of stock) or redirects.
export async function convertQuotationToInvoice(quotationId: string): Promise<{ error: string | null }> {
  const user = await requireUser();

  const [quotation] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, quotationId), eq(quotations.orgId, user.orgId)))
    .limit(1);

  if (!quotation) return { error: "Quotation not found." };

  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, quotationId))
    .orderBy(asc(quotationItems.sortOrder));
  if (items.length === 0) return { error: "This quotation has no line items." };

  const result = await createInvoiceRecord({
    orgId: user.orgId,
    createdBy: user.id,
    header: {
      customerId: quotation.customerId,
      leadId: quotation.leadId,
      quotationId: quotation.id,
      contactName: quotation.contactName,
      contactPhone: quotation.contactPhone,
      notes: quotation.notes,
      gstEnabled: quotation.gstEnabled,
      gstRate: quotation.gstRate,
      placeOfSupply: quotation.placeOfSupply,
      customerGstin: quotation.customerGstin,
      interState: quotation.interState,
    },
    items: items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      hsnSac: i.hsnSac,
      stockItemId: i.stockItemId,
    })),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  redirect(`/invoices/${result.id}`);
}
