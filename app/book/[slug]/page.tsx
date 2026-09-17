import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { BookingForm } from "./booking-form";

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [org] = await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
  if (!org) notFound();

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface-2 px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-mono text-xs uppercase tracking-wide text-faint">{org.name}</p>
          <h1 className="mt-1 font-display text-xl font-bold">Book with us</h1>
          <p className="mt-1 text-sm text-muted">Tell us what you need and we&apos;ll follow up.</p>
        </div>
        <Card className="p-6">
          <BookingForm slug={slug} />
        </Card>
      </div>
    </main>
  );
}
