import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { leads, organizations } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STAGE_COPY: Record<string, { label: string; hint: string }> = {
  new: { label: "Received", hint: "We've got your enquiry and will be in touch shortly." },
  contacted: { label: "In progress", hint: "We're working on your request." },
  quoted: { label: "Quoted", hint: "A quote has been shared with you." },
  booked: { label: "Booked", hint: "Your booking is confirmed." },
  lost: { label: "Closed", hint: "This booking is no longer active." },
};

export default async function PublicStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [lead] = await db.select().from(leads).where(eq(leads.publicToken, token)).limit(1);
  if (!lead) notFound();

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, lead.orgId)).limit(1);

  const stage = STAGE_COPY[lead.stage] ?? STAGE_COPY.new;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface-2 px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center font-mono text-xs uppercase tracking-wide text-faint">{org?.name}</p>
        <Card className="p-6">
          <p className="text-sm text-muted">Booking for</p>
          <h1 className="font-display text-lg font-bold">{lead.contactName}</h1>
          <p className="mt-1 text-sm text-muted">{lead.interest}</p>

          <div className="mt-5 flex items-center gap-2">
            <Badge tone="accent">{stage.label}</Badge>
          </div>
          <p className="mt-3 text-sm text-muted">{stage.hint}</p>

          <dl className="mt-6 flex flex-col gap-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Booked on</dt>
              <dd className="font-mono text-xs tabular-nums">{lead.createdAt.toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </main>
  );
}
