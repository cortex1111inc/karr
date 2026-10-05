import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";

export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const conditions = [eq(customers.orgId, user.orgId)];
  if (q) {
    const term = `%${q}%`;
    conditions.push(or(ilike(customers.fullName, term), ilike(customers.phone, term))!);
  }

  const [orgCustomers, [{ total }]] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(customers).where(and(...conditions)),
  ]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who's booked with you, in one record."
        action={
          <a href="/api/export/customers" className="text-sm font-medium text-accent-deep hover:underline">
            Export CSV
          </a>
        }
      />
      <div className="border-b border-border bg-surface px-4 sm:px-6 lg:px-8 py-4">
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
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {orgCustomers.length === 0 ? (
          q ? (
            <EmptyState title="No matches" description={`No customers match “${q}”.`} />
          ) : (
            <EmptyState
              title="No customers yet"
              description="Customers appear here once a lead is converted — open a lead and choose “Convert to customer”."
              action={<ButtonLink href="/leads" variant="ghost" size="sm">Go to leads</ButtonLink>}
            />
          )
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
        <Pagination page={page} total={total} pathname="/customers" searchParams={{ q }} />
      </div>
    </>
  );
}
