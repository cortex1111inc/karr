import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { customers, invoices, leads, whatsappMessages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/billing/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EditCustomerForm } from "./edit-customer-form";
import { DeleteCustomerButton } from "./delete-customer-button";

const INVOICE_STATUS_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  draft: "neutral",
  sent: "neutral",
  partial: "accent",
  paid: "accent",
  void: "danger",
};

const MESSAGE_KIND_LABEL: Record<string, string> = {
  vehicle_received: "Vehicle received",
  ready_for_pickup: "Ready for pickup",
  service_reminder: "Service reminder",
  campaign: "Campaign",
  manual: "Manual",
};

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

  const [history, messages, customerInvoices] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(eq(leads.customerId, id), eq(leads.orgId, user.orgId)))
      .orderBy(desc(leads.createdAt)),
    db
      .select()
      .from(whatsappMessages)
      .where(and(eq(whatsappMessages.customerId, id), eq(whatsappMessages.orgId, user.orgId)))
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(10),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.customerId, id), eq(invoices.orgId, user.orgId)))
      .orderBy(desc(invoices.createdAt)),
  ]);

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

          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Retention</h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Last service</dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {customer.lastServiceAt ? customer.lastServiceAt.toLocaleDateString() : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Next due</dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {customer.nextServiceDueAt ? customer.nextServiceDueAt.toLocaleDateString() : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Last reminder sent</dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {customer.lastReminderSentAt ? customer.lastReminderSentAt.toLocaleDateString() : "—"}
                  </dd>
                </div>
              </dl>
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

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold">Billing</h2>
                <ButtonLink href={`/invoices/new?customerId=${customer.id}`} variant="ghost" size="sm">
                  New invoice
                </ButtonLink>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {customerInvoices.length === 0 ? (
                  <p className="text-sm text-faint">No invoices yet.</p>
                ) : (
                  customerInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="block rounded-lg border border-border p-3 text-sm transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-faint">{invoice.number}</span>
                        <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
                      </div>
                      <span className="mt-1 block font-mono text-sm font-medium tabular-nums">
                        {formatCurrency(invoice.total)}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">WhatsApp activity</h2>
              <div className="mt-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-faint">No messages sent yet.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[0.68rem] uppercase tracking-wide text-faint">
                          {MESSAGE_KIND_LABEL[message.kind]}
                        </span>
                        <Badge tone={message.status === "sent" ? "accent" : "danger"}>{message.status}</Badge>
                        <span className="text-xs text-faint">{message.createdAt.toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-muted">{message.body}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
