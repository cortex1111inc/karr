import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/billing/money";
import { splitTax, stateName } from "@/lib/billing/gst";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PrintButton } from "./print-button";

export type DocumentOrg = {
  name: string;
  legalName: string | null;
  gstin: string | null;
  billingAddress: string | null;
  stateCode: string | null;
  logoUrl: string | null;
  invoiceTerms: string | null;
};

export type DocumentData = {
  kind: "Quotation" | "Tax invoice" | "Invoice";
  number: string;
  status: string;
  statusTone: "accent" | "neutral" | "danger";
  createdAt: Date;
  contactName: string;
  contactPhone: string;
  customerGstin: string | null;
  placeOfSupply: string | null;
  gstEnabled: boolean;
  gstRate: number;
  interState: boolean;
  subtotal: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  items: { id: string; description: string; hsnSac: string | null; quantity: string; unitPrice: string; amount: string }[];
};

// Customer-facing quote/invoice layout, shared by /quote and /invoice.
// Prints cleanly (print: variants hide chrome) so "Save as PDF" is the PDF.
export function DocumentView({ org, doc, extraTotals, children }: { org: DocumentOrg; doc: DocumentData; extraTotals?: ReactNode; children?: ReactNode }) {
  const tax = splitTax(Number(doc.taxAmount), doc.interState);
  const hasHsn = doc.items.some((i) => i.hsnSac);
  const half = doc.gstRate / 2;

  return (
    <main className="flex min-h-full flex-1 justify-center bg-surface-2 px-4 py-10 sm:px-6 sm:py-16 print:bg-white print:p-0">
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>
        <Card className="p-6 sm:p-8 print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-start gap-3">
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary owner-supplied https URL
                <img src={org.logoUrl} alt="" className="h-12 w-12 rounded-md object-contain" />
              ) : null}
              <div className="text-sm">
                <p className="font-display text-base font-bold">{org.legalName || org.name}</p>
                {org.billingAddress ? <p className="whitespace-pre-line text-muted">{org.billingAddress}</p> : null}
                {org.gstin ? <p className="font-mono text-xs text-muted">GSTIN {org.gstin}</p> : null}
              </div>
            </div>
            <div className="text-right">
              <h1 className="font-display text-xl font-bold">{doc.kind}</h1>
              <p className="font-mono text-sm">{doc.number}</p>
              <p className="text-xs text-muted">{doc.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              <Badge tone={doc.statusTone} className="mt-1 print:hidden">
                {doc.status}
              </Badge>
            </div>
          </header>

          <section className="mt-5 flex flex-wrap justify-between gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-faint">Bill to</p>
              <p className="font-semibold">{doc.contactName}</p>
              <p className="text-muted">{doc.contactPhone}</p>
              {doc.customerGstin ? <p className="font-mono text-xs text-muted">GSTIN {doc.customerGstin}</p> : null}
            </div>
            {doc.gstEnabled && doc.placeOfSupply ? (
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-faint">Place of supply</p>
                <p>
                  {stateName(doc.placeOfSupply)} ({doc.placeOfSupply})
                </p>
              </div>
            ) : null}
          </section>

          <div className="mt-5 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left print:bg-white">
                  <th className="p-2.5 font-medium text-faint">Description</th>
                  {hasHsn ? <th className="p-2.5 font-medium text-faint">HSN/SAC</th> : null}
                  <th className="p-2.5 text-right font-medium text-faint">Qty</th>
                  <th className="p-2.5 text-right font-medium text-faint">Rate</th>
                  <th className="p-2.5 text-right font-medium text-faint">Amount</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="p-2.5">{item.description}</td>
                    {hasHsn ? <td className="p-2.5 font-mono text-xs">{item.hsnSac ?? ""}</td> : null}
                    <td className="p-2.5 text-right font-mono tabular-nums">{Number(item.quantity)}</td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 ml-auto flex max-w-64 flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(doc.subtotal)}</dd>
            </div>
            {doc.gstEnabled && doc.interState ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted">IGST ({doc.gstRate}%)</dt>
                <dd className="font-mono tabular-nums">{formatCurrency(tax.igst)}</dd>
              </div>
            ) : doc.gstEnabled ? (
              <>
                <div className="flex justify-between gap-6">
                  <dt className="text-muted">CGST ({half}%)</dt>
                  <dd className="font-mono tabular-nums">{formatCurrency(tax.cgst)}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="text-muted">SGST ({half}%)</dt>
                  <dd className="font-mono tabular-nums">{formatCurrency(tax.sgst)}</dd>
                </div>
              </>
            ) : null}
            <div className="flex justify-between gap-6 border-t border-border pt-1.5 text-base font-semibold">
              <dt>Total</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(doc.total)}</dd>
            </div>
            {extraTotals}
          </dl>

          {doc.notes ? <p className="mt-5 border-t border-border pt-3 text-sm text-muted">{doc.notes}</p> : null}
          {org.invoiceTerms ? <p className="mt-3 whitespace-pre-line text-xs text-faint">{org.invoiceTerms}</p> : null}

          {children ? <div className="print:hidden">{children}</div> : null}
        </Card>
      </div>
    </main>
  );
}
