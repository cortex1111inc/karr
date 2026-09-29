import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { billingFormContext } from "@/lib/billing/form-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const user = await requireUser();
  const { customerId } = await searchParams;

  let defaultContactName: string | undefined;
  let defaultContactPhone: string | undefined;

  if (customerId) {
    const [customer] = await db
      .select({ fullName: customers.fullName, phone: customers.phone })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.orgId, user.orgId)))
      .limit(1);
    defaultContactName = customer?.fullName;
    defaultContactPhone = customer?.phone;
  }

  const context = await billingFormContext(user.orgId);

  return (
    <>
      <PageHeader title="New invoice" description="Bill a customer for a completed booking or service." />
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        <Card className="max-w-3xl p-6">
          <InvoiceForm
            defaultContactName={defaultContactName}
            defaultContactPhone={defaultContactPhone}
            customerId={customerId}
            defaultGstRate={context.defaultGstRate}
            orgStateCode={context.orgStateCode}
            stockOptions={context.stockOptions}
          />
        </Card>
      </div>
    </>
  );
}
