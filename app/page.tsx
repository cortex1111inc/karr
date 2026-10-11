import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/header";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { FAQS, Faq, Features, FinalCta, HowItWorks, MadeForIndia, MarketingFooter, Problem, Trust } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} — software for car rental and service businesses` },
  description: BRAND.description,
  alternates: { canonical: "/" },
};

// The public front door. Signed-in visitors see the same page with a shortcut
// into their workspace, rather than being bounced away from it.
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: BRAND.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: BRAND.description,
        url: getSiteUrl(),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <MarketingHeader signedIn={signedIn} />
      <main id="top" className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex rounded-full border border-accent-soft bg-accent-soft px-3 py-1 text-xs font-medium text-accent-deep">
              For car rental and car service businesses
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
              Run your rentals and workshop from one steady place.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted text-pretty">
              Drivestead brings your leads, quotations, GST invoices, payments, fleet and stock together — so nothing slips between a notebook, a spreadsheet and a phone.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={signedIn ? "/app/dashboard" : "/signup"} variant="accent" size="md">
                {signedIn ? "Open your workspace" : "Create your workspace"}
              </ButtonLink>
              <ButtonLink href="#how" variant="ghost" size="md">
                See how it works
              </ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li>GST-ready invoices</li>
              <li>UPI and card payments</li>
              <li>Works on your phone</li>
            </ul>
          </div>
          <HeroPreview />
        </section>

        <Problem />
        <Features />
        <HowItWorks />
        <MadeForIndia />
        <Trust />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <MarketingFooter signedIn={signedIn} />
    </div>
  );
}
