import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orgSites, organizations } from "@/db/schema";
import { formatCurrency } from "@/lib/billing/money";
import { SITE_ACCENTS } from "@/lib/site-theme";
import { BookingForm } from "@/app/book/[slug]/booking-form";

async function loadSite(slug: string) {
  const [row] = await db
    .select({ org: organizations, site: orgSites })
    .from(organizations)
    .innerJoin(orgSites, eq(orgSites.orgId, organizations.id))
    .where(eq(organizations.slug, slug))
    .limit(1);
  return row && row.site.published ? row : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const row = await loadSite((await params).slug);
  if (!row) return { title: "Not found" };
  const title = row.site.headline || row.org.name;
  const description = row.site.tagline || `Book with ${row.org.name}.`;
  return {
    title,
    description,
    openGraph: { title, description, images: row.site.heroImageUrl ? [row.site.heroImageUrl] : undefined },
  };
}

function waLink(number: string, business: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${business}, I'd like to book.`)}`;
}

// Public, mobile-first page per business — where influencer/ad traffic lands.
export default async function OrgSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const row = await loadSite(slug);
  if (!row) notFound();
  const { org, site } = row;
  const accent = SITE_ACCENTS[site.accent] ?? SITE_ACCENTS.green;

  return (
    <main className="min-h-full flex-1 bg-background" style={{ ["--site-accent" as string]: accent.bg, ["--site-accent-text" as string]: accent.text, ["--site-soft" as string]: accent.soft }}>
      <section className="relative overflow-hidden bg-[var(--site-soft)]">
        {site.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary owner-supplied URL; next/image would need every host allow-listed
          <img src={site.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        ) : null}
        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">{org.name}</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold text-balance sm:text-5xl">{site.headline || org.name}</h1>
          {site.tagline ? <p className="mt-3 max-w-xl text-base text-muted sm:text-lg">{site.tagline}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#book" className="inline-flex h-11 items-center rounded-lg bg-[var(--site-accent)] px-5 text-sm font-semibold text-[var(--site-accent-text)]">
              Book now
            </a>
            {site.whatsappNumber ? (
              <a
                href={waLink(site.whatsappNumber, org.name)}
                className="inline-flex h-11 items-center rounded-lg border border-border-strong bg-surface px-5 text-sm font-semibold"
                rel="noopener"
              >
                Chat on WhatsApp
              </a>
            ) : null}
            {site.phone ? (
              <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center px-2 text-sm font-medium text-foreground underline-offset-4 hover:underline">
                Call {site.phone}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {site.services.length > 0 ? (
        <section aria-labelledby="services" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h2 id="services" className="font-display text-xl font-bold">Services</h2>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {site.services.map((svc) => (
              <li key={svc.name} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{svc.name}</h3>
                  {svc.priceFrom ? <span className="flex-none text-sm text-muted">from {formatCurrency(svc.priceFrom)}</span> : null}
                </div>
                {svc.description ? <p className="mt-1.5 text-sm text-muted">{svc.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-2">
          <div>
            {site.about ? (
              <>
                <h2 className="font-display text-xl font-bold">About us</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{site.about}</p>
              </>
            ) : null}
            <dl className="mt-6 flex flex-col gap-3 text-sm">
              {site.hours ? (
                <div>
                  <dt className="font-medium">Hours</dt>
                  <dd className="whitespace-pre-line text-muted">{site.hours}</dd>
                </div>
              ) : null}
              {site.address ? (
                <div>
                  <dt className="font-medium">Find us</dt>
                  <dd className="whitespace-pre-line text-muted">{site.address}</dd>
                  {site.mapUrl ? (
                    <a href={site.mapUrl} rel="noopener" className="mt-1 inline-block text-accent-deep hover:underline">
                      Open in Maps →
                    </a>
                  ) : null}
                </div>
              ) : null}
            </dl>
          </div>

          <div id="book" className="scroll-mt-4">
            <h2 className="font-display text-xl font-bold">Request a booking</h2>
            <p className="mt-1 text-sm text-muted">Tell us what you need — we&apos;ll confirm by phone or WhatsApp.</p>
            <div className="mt-4 rounded-xl border border-border bg-background p-5">
              <BookingForm slug={slug} refCode={ref} />
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-4xl px-4 py-8 text-xs text-faint sm:px-6">
        © {new Date().getFullYear()} {org.name}
      </footer>
    </main>
  );
}
