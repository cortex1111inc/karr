import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments, paymentMethodEnum } from "@/db/schema";

export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];

// Recomputes amountPaid from the payments table and derives status, in one
// UPDATE. Deriving from SUM(payments) instead of "old amountPaid + x" means
// two payments recorded at the same moment can't overwrite each other, and
// any past drift self-heals on the next payment.
export async function syncInvoicePaymentStatus(invoiceId: string) {
  const paidSum = sql`(SELECT COALESCE(SUM(${payments.amount}), 0) FROM ${payments} WHERE ${payments.invoiceId} = ${invoices.id})`;

  const [row] = await db
    .update(invoices)
    .set({
      amountPaid: sql`${paidSum}`,
      status: sql`CASE
        WHEN ${invoices.status} = 'void' THEN 'void'::invoice_status
        WHEN ${paidSum} > 0 AND ${paidSum} >= ${invoices.total} THEN 'paid'::invoice_status
        WHEN ${paidSum} > 0 THEN 'partial'::invoice_status
        WHEN ${invoices.status} IN ('paid', 'partial') THEN 'sent'::invoice_status
        ELSE ${invoices.status}
      END`,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning({ amountPaid: invoices.amountPaid, status: invoices.status });

  return row;
}

export type ApplyPaymentInput = {
  orgId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  notes?: string | null;
  recordedBy?: string | null;
  paidAt?: Date;
  providerPaymentId?: string | null;
  online?: boolean;
};

// Shared by the manual "Record payment" form and the payment-gateway
// webhook, so both follow exactly the same rules. A repeated
// providerPaymentId (redelivered webhook) is a no-op returning duplicate: true.
export async function applyPayment(
  input: ApplyPaymentInput,
): Promise<{ ok: true; duplicate?: boolean } | { ok: false; error: string }> {
  const [invoice] = await db
    .select({ status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)))
    .limit(1);

  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "void") {
    return { ok: false, error: "This invoice is void — payments can't be recorded against it." };
  }
  if (!(input.amount > 0)) return { ok: false, error: "Enter an amount greater than zero" };

  const inserted = await db
    .insert(payments)
    .values({
      orgId: input.orgId,
      invoiceId: input.invoiceId,
      amount: input.amount.toString(),
      method: input.method,
      notes: input.notes ?? null,
      recordedBy: input.recordedBy ?? null,
      paidAt: input.paidAt ?? new Date(),
      providerPaymentId: input.providerPaymentId ?? null,
      online: input.online ?? false,
    })
    .onConflictDoNothing()
    .returning({ id: payments.id });
  if (inserted.length === 0) return { ok: true, duplicate: true };

  await syncInvoicePaymentStatus(input.invoiceId);
  return { ok: true };
}

export async function removePayment(orgId: string, invoiceId: string, paymentId: string): Promise<boolean> {
  const [invoice] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!invoice) return false;

  const deleted = await db
    .delete(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.invoiceId, invoiceId)))
    .returning({ id: payments.id });
  if (deleted.length === 0) return false;

  await syncInvoicePaymentStatus(invoiceId);
  return true;
}
