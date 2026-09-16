import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditCustomerForm } from "./edit-customer-form";
import { DeleteCustomerButton } from "./delete-customer-button";

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  lost: "Lost",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.orgId, user.orgId)))
    .limit(1);

  if (!customer) notFound();

  const history = await db
    .select()
    .from(leads)
    .where(and(eq(leads.customerId, id), eq(leads.orgId, user.orgId)))
    .orderBy(desc(leads.createdAt));

  return (
    <>
      <PageHeader
        title={customer.fullName}
        description={
          <Link href="/customers" className="text-sm text-muted hover:text-foreground">
            ← Back to customers
          </Link>
        }
        action={<DeleteCustomerButton customerId={customer.id} customerName={customer.fullName} />}
      />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Profile</h2>
            <EditCustomerForm customer={customer} />
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Booking / service history</h2>
            <div className="mt-4 flex flex-col gap-3">
              {history.length === 0 ? (
                <p className="text-sm text-faint">No linked bookings yet.</p>
              ) : (
                history.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="block rounded-lg border border-border p-3 text-sm transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{lead.interest}</span>
                      <Badge tone="neutral">{STAGE_LABEL[lead.stage]}</Badge>
                    </div>
                    <span className="mt-1 block font-mono text-[0.68rem] text-faint">
                      {lead.createdAt.toLocaleDateString()}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
