import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
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

  const [org] = await db
    .select({ defaultGstRate: organizations.defaultGstRate })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);

  return (
    <>
      <PageHeader title="New invoice" description="Bill a customer for a completed booking or service." />
      <div className="flex-1 px-8 py-6">
        <Card className="max-w-3xl p-6">
          <InvoiceForm
            defaultContactName={defaultContactName}
            defaultContactPhone={defaultContactPhone}
            customerId={customerId}
            defaultGstRate={org?.defaultGstRate ?? 18}
          />
        </Card>
      </div>
    </>
  );
}
