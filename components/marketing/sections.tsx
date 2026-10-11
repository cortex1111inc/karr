import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { Icon, type IconName } from "./icons";

function SectionHead({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div id={id} className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-accent-deep">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-balance sm:text-3xl">{title}</h2>
      {children ? <p className="mt-3 text-muted text-pretty">{children}</p> : null}
    </div>
  );
}

const PAINS = [
  {
    title: "Enquiries live in five places",
    body: "Phone calls, DMs, a notebook, a forwarded message. Some never get a reply, and nobody can say how many were lost.",
  },
  {
    title: "Quotes and GST eat your evening",
    body: "Copying numbers into a template, working out CGST and IGST by hand, then chasing the same invoice twice.",
  },
  {
    title: "Regular customers drift away",
    body: "No one remembers who is due for a service, which car is free next week, or which part is about to run out.",
  },
];

export function Problem() {
  return (
    <section className="border-y border-border bg-surface-2/60 py-16 sm:py-20" aria-label="The problem">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Sound familiar?" title="Running a car business shouldn’t mean running five systems" />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {PAINS.map((p) => (
            <li key={p.title} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-display text-base font-bold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "pipeline", title: "Lead pipeline", body: "Every enquiry in one board, with an owner, a stage and a next step. Quiet leads nudge you before they go cold." },
  { icon: "document", title: "Quotes and GST invoices", body: "GSTIN, HSN/SAC and the CGST+SGST or IGST split worked out for you. Share a link, email it, or print it." },
  { icon: "card", title: "Get paid, your way", body: "Record cash, UPI, card or transfers, or add a Pay now button powered by Razorpay. Part payments are fine." },
  { icon: "calendar", title: "Fleet calendar", body: "See which car is out this week. Double-bookings are blocked, and a car returns to available when its rental ends." },
  { icon: "box", title: "Stock that follows the bill", body: "Add a part to an invoice and it leaves your stock in the same step. Low-stock alerts reach you in time." },
  { icon: "bell", title: "Daily reminders", body: "Customers due for service, follow-ups due, unpaid invoices, low stock — one tidy list every morning." },
  { icon: "link", title: "Know what brings customers", body: "Give each influencer or ad its own link. See clicks, bookings and revenue, and the commission you owe." },
  { icon: "chart", title: "Reports that add up", body: "A real sales funnel, revenue by week, money still owed by age, and a CSV for your accountant." },
];

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24" aria-label="Features">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Everything in one place" title="From first enquiry to repeat customer">
          Drivestead covers the whole job, so your team stops switching between tools.
        </SectionHead>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-xl border border-border bg-surface p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-deep">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Capture", body: "A booking-form request, a call you log or a walk-in becomes a lead in two taps — and remembers which influencer or ad sent it." },
  { title: "Quote", body: "Pick the lead, add lines — the rental days and rate fill in themselves. The customer accepts on a link." },
  { title: "Book and bill", body: "Assign a car or parts, convert to an invoice with GST, and take the payment or the advance." },
  { title: "Bring them back", body: "Reminders tell you who is due for service and what’s unpaid, so repeat business doesn’t depend on memory." },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-border bg-surface-2/60 py-16 sm:py-24" aria-label="How it works">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="How it works" title="One job, four steps">
          The same flow whether it’s a three-day rental or a brake-pad change.
        </SectionHead>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-border bg-surface p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-deep font-mono text-sm text-white">{i + 1}</span>
              <h3 className="mt-3 font-display text-base font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center text-sm text-muted">
          Inside the product, a guided tour walks through a sample rental with every screen — you can click through it before entering a single record.
        </p>
      </div>
    </section>
  );
}

const INDIA = [
  { title: "GST that fits", body: "Your GSTIN and state, customer GSTIN, HSN/SAC codes, and CGST + SGST or IGST chosen by place of supply." },
  { title: "UPI, cards, cash", body: "Take payments the way customers actually pay, and see what is still outstanding." },
  { title: "Rupees, the way you read them", body: "Amounts shown in lakh and crore grouping, in INR, everywhere." },
  { title: "Works on a phone", body: "Built for the counter, the workshop floor and the road — not only a desk." },
];

export function MadeForIndia() {
  return (
    <section className="py-16 sm:py-24" aria-label="Made for Indian businesses">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-accent-deep">Made for India</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-balance sm:text-3xl">Built around how Indian rental and service shops really work</h2>
          <p className="mt-3 text-muted text-pretty">
            Self-drive rentals, chauffeur and travel desks, car service centres and multi-brand garages — small, owner-run teams that need the paperwork right without hiring an accountant for every invoice.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {INDIA.map((i) => (
            <li key={i.title} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-display text-base font-bold">{i.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{i.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const TRUST = [
  { title: "Every business is walled off", body: "Your records are separated from everyone else’s, enforced in the database itself — not just in the screens." },
  { title: "Keys are encrypted", body: "Payment and email credentials are encrypted at rest and never shown again once saved." },
  { title: "Owners and staff", body: "Staff can do the daily work. Deleting records, connecting services and managing the team stay with the owner." },
  { title: "A record of what changed", body: "Voided invoices, deleted records, team and integration changes are written to an audit log you can read." },
  { title: "Your data stays portable", body: "Export leads, customers and invoices to CSV whenever you like — for backups or your accountant." },
  { title: "Share links are private", body: "Quotes and invoices open on unguessable links, rate-limited, and kept out of search engines." },
];

export function Trust() {
  return (
    <section id="trust" className="border-y border-border bg-surface-2/60 py-16 sm:py-24" aria-label="Security and trust">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Security and trust" title="Your customers’ details deserve care">
          Plain facts about how your data is handled.
        </SectionHead>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((t) => (
            <li key={t.title} className="flex gap-3 rounded-xl border border-border bg-surface p-5">
              <Icon name="shield" className="mt-0.5 h-5 w-5 flex-none text-accent-deep" />
              <div>
                <h3 className="font-display text-base font-bold">{t.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export const FAQS = [
  {
    q: "Who is Drivestead for?",
    a: "Car rental businesses, chauffeur and travel desks, car service centres and multi-brand garages — owner-run teams that handle enquiries, quotes, invoices and repeat customers every day.",
  },
  {
    q: "Do I need a developer or any special setup?",
    a: "No. Create a workspace, add your business details, and start logging leads. A guided tour inside the product shows the whole flow, and a checklist tells you what to set up next.",
  },
  {
    q: "Does it handle GST properly?",
    a: "Yes. Add your GSTIN and state once. Quotes and invoices carry HSN/SAC codes and your customer’s GSTIN, and split tax into CGST + SGST or IGST by place of supply. Documents print cleanly to PDF.",
  },
  {
    q: "Can customers pay online?",
    a: "Yes. Connect your own Razorpay account and every invoice link gets a Pay now button for UPI, cards and netbanking. Cash, card and transfer payments you take yourself are recorded the same way.",
  },
  {
    q: "Does it work on a phone?",
    a: "Yes. Every screen is designed to work at phone width, so you can log a lead or record a payment from the counter or the road.",
  },
  {
    q: "How does my team get access?",
    a: "Invite them by email. Staff can do the daily work; the owner keeps control of integrations, billing details, deleting records and the team itself.",
  },
  {
    q: "Can I take my data with me?",
    a: "Yes. Leads, customers and invoices export to CSV at any time, and leads and invoices can also be exported for a date range.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-16 sm:py-24" aria-label="Frequently asked questions">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHead eyebrow="FAQ" title="Questions owners ask first" />
        <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQS.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold">
                {f.q}
                <span aria-hidden="true" className="text-faint transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="pb-16 sm:pb-24" aria-label="Get started">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl bg-accent-deep px-6 py-12 text-center text-white sm:px-12">
          <h2 className="font-display text-2xl font-bold text-balance sm:text-3xl">Give your business a steady base</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85 text-pretty">
            Create a workspace, add your details, and run your next enquiry from first message to paid invoice.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={signedIn ? "/app/dashboard" : "/signup"} variant="accent" size="md">
              {signedIn ? "Open your workspace" : "Create your workspace"}
            </ButtonLink>
            {signedIn ? null : (
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-white/90 underline-offset-4 hover:underline">
                I already have an account
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarketingFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="border-t border-border bg-surface py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-muted">The steady base for car rental and service businesses in India.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <a href="#features" className="text-muted hover:text-foreground">
            Features
          </a>
          <a href="#how" className="text-muted hover:text-foreground">
            How it works
          </a>
          <a href="#faq" className="text-muted hover:text-foreground">
            FAQ
          </a>
          {signedIn ? (
            <Link href="/app/dashboard" className="text-muted hover:text-foreground">
              Open your workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                Sign in
              </Link>
              <Link href="/signup" className="text-muted hover:text-foreground">
                Create workspace
              </Link>
            </>
          )}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-faint sm:px-6">© {new Date().getFullYear()} Drivestead. All rights reserved.</p>
    </footer>
  );
}
