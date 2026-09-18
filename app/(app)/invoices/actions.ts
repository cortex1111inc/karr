"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invoiceItems, invoices, paymentMethodEnum, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { calculateTotals } from "@/lib/billing/money";
import { nextDocumentNumber } from "@/lib/billing/numbering";
import { parseLineItems } from "@/lib/billing/schema";
import { generatePublicToken } from "@/lib/tokens";

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

  const totals = calculateTotals(items.data, parsed.data.gstEnabled, parsed.data.gstRate);
  const number = await nextDocumentNumber(user.orgId, "invoice");

  const [invoice] = await db
    .insert(invoices)
    .values({
      orgId: user.orgId,
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
    .returning({ id: invoices.id });

  await db.insert(invoiceItems).values(
    items.data.map((item, index) => ({
      invoiceId: invoice.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
      sortOrder: index,
    })),
  );

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatus(invoiceId: string, status: "draft" | "sent" | "void") {
  const user = await requireUser();

  await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)));

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(invoiceId: string) {
  const user = await requireUser();

  await db
    .delete(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId), eq(invoices.status, "draft")));

  revalidatePath("/invoices");
  redirect("/invoices");
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

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)))
    .limit(1);

  if (!invoice) {
    return { error: "Invoice not found." };
  }
  if (invoice.status === "void") {
    return { error: "This invoice is void — payments can't be recorded against it." };
  }

  await db.insert(payments).values({
    orgId: user.orgId,
    invoiceId,
    amount: parsed.data.amount.toString(),
    method: parsed.data.method,
    notes: parsed.data.notes,
    recordedBy: user.id,
  });

  const newAmountPaid = Number(invoice.amountPaid) + parsed.data.amount;
  const total = Number(invoice.total);
  const nextStatus = newAmountPaid >= total ? "paid" : newAmountPaid > 0 ? "partial" : invoice.status;

  await db
    .update(invoices)
    .set({ amountPaid: newAmountPaid.toString(), status: nextStatus, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { error: null };
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  const user = await requireUser();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId)))
    .limit(1);
  if (!invoice) return;

  const [payment] = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.invoiceId, invoiceId)))
    .limit(1);
  if (!payment) return;

  await db.delete(payments).where(eq(payments.id, paymentId));

  const newAmountPaid = Math.max(0, Number(invoice.amountPaid) - Number(payment.amount));
  const total = Number(invoice.total);
  const nextStatus =
    newAmountPaid >= total ? "paid" : newAmountPaid > 0 ? "partial" : invoice.status === "paid" || invoice.status === "partial" ? "sent" : invoice.status;

  await db
    .update(invoices)
    .set({ amountPaid: newAmountPaid.toString(), status: nextStatus, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
