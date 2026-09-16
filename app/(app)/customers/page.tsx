import { and, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, ButtonLink } from "@/components/ui/button";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;

  const conditions = [eq(customers.orgId, user.orgId)];
  if (q) {
    const term = `%${q}%`;
    conditions.push(or(ilike(customers.fullName, term), ilike(customers.phone, term))!);
  }

  const orgCustomers = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.createdAt));

  return (
    <>
      <PageHeader title="Customers" description="Everyone who's booked with you, in one record." />
      <div className="border-b border-border bg-surface px-8 py-4">
        <form method="get" className="flex items-end gap-3">
          <div className="w-72">
            <label htmlFor="q" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint">
              Search
            </label>
            <Input id="q" name="q" defaultValue={q} placeholder="Name or phone…" />
          </div>
          <Button type="submit" variant="ghost" size="sm">
            Search
          </Button>
          {q ? (
            <ButtonLink href="/customers" variant="ghost" size="sm">
              Clear
            </ButtonLink>
          ) : null}
        </form>
      </div>
      <div className="flex-1 px-8 py-6">
        {orgCustomers.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">
            No customers yet — they&apos;ll show up here once a lead is marked booked and converted.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgCustomers.map((customer) => (
              <Link key={customer.id} href={`/customers/${customer.id}`}>
                <Card className="p-4 transition-colors hover:border-border-strong">
                  <p className="text-sm font-semibold">{customer.fullName}</p>
                  <p className="mt-0.5 text-xs text-muted">{customer.phone}</p>
                  {customer.vehicleNumber ? (
                    <p className="mt-2 font-mono text-[0.68rem] text-faint">{customer.vehicleNumber}</p>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
