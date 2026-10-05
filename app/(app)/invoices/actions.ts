"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invoices, paymentMethodEnum } from "@/db/schema";
import { requireOwner, requireUser } from "@/lib/auth";
import { readGstFields } from "@/lib/billing/gst-fields";
import { createInvoiceRecord, moveInvoiceStock } from "@/lib/billing/invoices";
import { applyPayment, removePayment, syncInvoicePaymentStatus } from "@/lib/billing/payments";
import { ownedCustomerId } from "@/lib/org-refs";
import { parseLineItems } from "@/lib/billing/schema";
import { audit } from "@/lib/audit";

const invoiceSchema = z.object({
  contactName: z.string().trim().min(1, "Name is required"),
  contactPhone: z.string().trim().min(1, "Phone is required"),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  gstEnabled: z.coerce.boolean(),
  gstRate: z.coerce.number().min(0).max(100),
  customerId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function createInvoice(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = invoiceSchema.safeParse({
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    notes: formData.get("notes"),
    gstEnabled: formData.get("gstEnabled") === "true",
    gstRate: formData.get("gstRate"),
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

  const customerId = await ownedCustomerId(user.orgId, parsed.data.customerId);
  const result = await createInvoiceRecord({
    orgId: user.orgId,
    createdBy: user.id,
    header: { ...parsed.data, ...gst, customerId },
    items: items.data,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/invoices");
  revalidatePath("/inventory");
  redirect(`/invoices/${result.id}`);
}

// Voiding returns stock-linked lines to inventory; un-voiding takes them
// again (and fails if there's no longer enough).
export async function updateInvoiceStatus(invoiceId: string, status: "draft" | "sent" | "void"): Promise<{ error: string | null }> {
  const user = await requireUser();

  const [invoice] = await db
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)))
    .limit(1);
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === status) return { error: null };

  const leavingVoid = invoice.status === "void";
  if (status === "void" || leavingVoid) {
    const moved = await moveInvoiceStock({
      orgId: user.orgId,
      invoiceId,
      direction: status === "void" ? "return" : "take",
      createdBy: user.id,
    });
    if (!moved.ok) return { error: moved.error };
  }

  await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)));
  if (status === "void" || leavingVoid) {
    await audit(user, { action: status === "void" ? "invoice.void" : "invoice.unvoid", targetType: "invoice", targetId: invoiceId, summary: `${status === "void" ? "Voided" : "Reinstated"} an invoice` });
  }
  // Un-voiding an invoice that had payments: re-derive partial/paid.
  if (leavingVoid) await syncInvoicePaymentStatus(invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  return { error: null };
}

export async function deleteInvoice(invoiceId: string) {
  const user = await requireOwner();

  const [invoice] = await db
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)))
    .limit(1);
  if (invoice?.status !== "draft") return;

  await moveInvoiceStock({ orgId: user.orgId, invoiceId, direction: "return", createdBy: user.id });
  await audit(user, { action: "invoice.delete", targetType: "invoice", targetId: invoiceId, summary: "Deleted a draft invoice" });
  await db
    .delete(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId), eq(invoices.status, "draft")));

  revalidatePath("/invoices");
  revalidatePath("/inventory");
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  method: z.enum(paymentMethodEnum.enumValues),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function recordPayment(invoiceId: string, _prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = paymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const result = await applyPayment({
    orgId: user.orgId,
    invoiceId,
    amount: parsed.data.amount,
    method: parsed.data.method,
    notes: parsed.data.notes,
    recordedBy: user.id,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { error: null };
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  const user = await requireOwner();

  if (!(await removePayment(user.orgId, invoiceId, paymentId))) return;
  await audit(user, { action: "payment.delete", targetType: "payment", targetId: paymentId, summary: "Deleted a recorded payment" });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
