"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invoiceItems, invoices, quotationItems, quotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { calculateTotals } from "@/lib/billing/money";
import { nextDocumentNumber } from "@/lib/billing/numbering";
import { parseLineItems } from "@/lib/billing/schema";
import { generatePublicToken } from "@/lib/tokens";

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

  const totals = calculateTotals(items.data, parsed.data.gstEnabled, parsed.data.gstRate);
  const number = await nextDocumentNumber(user.orgId, "quotation");

  const [quotation] = await db
    .insert(quotations)
    .values({
      orgId: user.orgId,
      leadId: parsed.data.leadId,
      customerId: parsed.data.customerId,
      number,
      contactName: parsed.data.contactName,
      contactPhone: parsed.data.contactPhone,
      notes: parsed.data.notes,
      gstEnabled: parsed.data.gstEnabled,
      gstRate: parsed.data.gstEnabled ? parsed.data.gstRate : 0,
      subtotal: totals.subtotal.toString(),
      taxAmount: totals.taxAmount.toString(),
      total: totals.total.toString(),
      publicToken: generatePublicToken(),
      createdBy: user.id,
    })
    .returning({ id: quotations.id });

  await db.insert(quotationItems).values(
    items.data.map((item, index) => ({
      quotationId: quotation.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
      sortOrder: index,
    })),
  );

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
  redirect("/quotations");
}

export async function convertQuotationToInvoice(quotationId: string) {
  const user = await requireUser();

  const [quotation] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, quotationId), eq(quotations.orgId, user.orgId)))
    .limit(1);

  if (!quotation) return;

  const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));

  const number = await nextDocumentNumber(user.orgId, "invoice");

  const [invoice] = await db
    .insert(invoices)
    .values({
      orgId: user.orgId,
      customerId: quotation.customerId,
      leadId: quotation.leadId,
      quotationId: quotation.id,
      number,
      contactName: quotation.contactName,
      contactPhone: quotation.contactPhone,
      notes: quotation.notes,
      gstEnabled: quotation.gstEnabled,
      gstRate: quotation.gstRate,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      total: quotation.total,
      publicToken: generatePublicToken(),
      createdBy: user.id,
    })
    .returning({ id: invoices.id });

  if (items.length > 0) {
    await db.insert(invoiceItems).values(
      items.map((item) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        sortOrder: item.sortOrder,
      })),
    );
  }

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}
