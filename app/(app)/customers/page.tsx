import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default async function CustomersPage() {
  const user = await requireUser();

  const orgCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.orgId, user.orgId))
    .orderBy(desc(customers.createdAt));

  return (
    <>
      <PageHeader title="Customers" description="Everyone who's booked with you, in one record." />
      <div className="flex-1 px-8 py-6">
        {orgCustomers.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">
            No customers yet — they&apos;ll show up here once a lead is marked booked and converted.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgCustomers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <p className="text-sm font-semibold">{customer.fullName}</p>
                <p className="mt-0.5 text-xs text-muted">{customer.phone}</p>
                {customer.vehicleNumber ? (
                  <p className="mt-2 font-mono text-[0.68rem] text-faint">{customer.vehicleNumber}</p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
