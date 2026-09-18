import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, leads, organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { QuotationForm } from "./quotation-form";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string }>;
}) {
  const user = await requireUser();
  const { leadId, customerId } = await searchParams;

  let defaultContactName: string | undefined;
  let defaultContactPhone: string | undefined;

  if (leadId) {
    const [lead] = await db
      .select({ contactName: leads.contactName, contactPhone: leads.contactPhone })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)))
      .limit(1);
    defaultContactName = lead?.contactName;
    defaultContactPhone = lead?.contactPhone;
  } else if (customerId) {
    const [customer] = await db
      .select({ fullName: customers.fullName, phone: customers.phone })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.orgId, user.orgId)))
      .limit(1);
    defaultContactName = customer?.fullName;
    defaultContactPhone = customer?.phone;
  }

  const [org] = await db
    .select({ defaultGstRate: organizations.defaultGstRate })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);

  return (
    <>
      <PageHeader title="New quotation" description="Send a price estimate before a booking is confirmed." />
      <div className="flex-1 px-8 py-6">
        <Card className="max-w-3xl p-6">
          <QuotationForm
            defaultContactName={defaultContactName}
            defaultContactPhone={defaultContactPhone}
            leadId={leadId}
            customerId={customerId}
            defaultGstRate={org?.defaultGstRate ?? 18}
          />
        </Card>
      </div>
    </>
  );
}
