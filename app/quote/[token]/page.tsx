import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { quotationItems, quotations } from "@/db/schema";
import { documentOrg } from "@/lib/billing/document-org";
import { DocumentView } from "@/components/billing/document-view";
import { QuoteResponse } from "./quote-response";

export default async function PublicQuotationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [quotation] = await db.select().from(quotations).where(eq(quotations.publicToken, token)).limit(1);
  if (!quotation) notFound();

  const [org, items] = await Promise.all([
    documentOrg(quotation.orgId),
    db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotation.id)).orderBy(asc(quotationItems.sortOrder)),
  ]);
  const open = quotation.status === "draft" || quotation.status === "sent";

  return (
    <DocumentView
      org={org}
      doc={{
        ...quotation,
        kind: "Quotation",
        statusTone: quotation.status === "accepted" ? "accent" : quotation.status === "declined" ? "danger" : "neutral",
        items,
      }}
    >
      {open && !quotation.respondedAt ? (
        <QuoteResponse token={token} />
      ) : open && quotation.respondedAt ? (
        <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted">
          You asked for changes — we&apos;ll send a revised quotation.
        </p>
      ) : null}
    </DocumentView>
  );
}
