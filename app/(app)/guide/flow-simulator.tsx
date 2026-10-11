"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { calculateTotals, formatCurrency } from "@/lib/billing/money";
import { splitTax } from "@/lib/billing/gst";
import { FLOW } from "@/lib/guide-content";
import { cn } from "@/lib/utils";
import { Frame, LeadCard, MiniBars, Pill, Row } from "./mocks";

// A made-up rental, acted out step by step. Nothing here touches real data;
// the buttons inside the previews only change this component's state.

const QUOTE_LINES = [
  { description: "Hyundai Creta · 3 days", quantity: 3, unitPrice: 3400 },
  { description: "Airport pickup", quantity: 1, unitPrice: 800 },
];
const FILTER_LINE = { description: "Cabin air filter (from stock)", quantity: 1, unitPrice: 590 };
const ADVANCE = 4000;
const GST_RATE = 18;

type Flags = { interState: boolean; accepted: boolean; clash: boolean; invoiced: boolean; paid: boolean };
const INITIAL: Flags = { interState: false, accepted: false, clash: false, invoiced: false, paid: false };

function TaxRows({ tax, interState }: { tax: number; interState: boolean }) {
  const split = splitTax(tax, interState);
  return interState ? (
    <Row label={`IGST (${GST_RATE}%)`} value={formatCurrency(split.igst)} />
  ) : (
    <>
      <Row label={`CGST (${GST_RATE / 2}%)`} value={formatCurrency(split.cgst)} />
      <Row label={`SGST (${GST_RATE / 2}%)`} value={formatCurrency(split.sgst)} />
    </>
  );
}

function Lines({ lines, linked }: { lines: { description: string; quantity: number; unitPrice: number }[]; linked?: string }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
      {lines.map((l) => (
        <li key={l.description} className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            {l.description}
            {linked && l.description === linked ? <Pill tone="accent">stock-linked</Pill> : null}
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums">
            {l.quantity} × {formatCurrency(l.unitPrice)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Preview({ index, flags, set }: { index: number; flags: Flags; set: (patch: Partial<Flags>) => void }) {
  const quote = calculateTotals(QUOTE_LINES, true, GST_RATE);
  const invLines = [...QUOTE_LINES, FILTER_LINE];
  const inv = calculateTotals(invLines, true, GST_RATE);
  const balance = Math.round((inv.total - ADVANCE) * 100) / 100;

  switch (index) {
    case 0:
      return (
        <Frame label="Preview: booking form becoming a lead" title="Booking page → Leads">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-display font-bold">Book with us</p>
              <p className="text-xs text-muted">Name: Anjali Menon</p>
              <p className="text-xs text-muted">Phone: +91 55555 10007</p>
              <p className="text-xs text-muted">Need: Creta, Fri–Sun, airport pickup</p>
              <p className="text-center text-xs text-faint">Submitted from the link on your Instagram bio</p>
            </div>
            <div className="flex flex-col gap-2">
              <LeadCard highlight name="Anjali Menon" stage="New" note="Creta · Fri–Sun · airport pickup" source="Source: Website · via Arjun Travels link" />
              <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
                <span className="font-medium text-foreground">Notification to you:</span> New booking request from Anjali Menon
              </p>
            </div>
          </div>
        </Frame>
      );
    case 1:
      return (
        <Frame label="Preview: lead pipeline board" title="Leads · pipeline">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {["New", "Contacted", "Quoted", "Booked"].map((col) => (
              <div key={col} className="flex flex-col gap-2 rounded-lg bg-surface-2 p-2">
                <p className="px-1 font-mono text-[0.65rem] uppercase tracking-wider text-faint">{col}</p>
                {col === "Contacted" ? (
                  <LeadCard highlight name="Anjali Menon" stage="Contacted" note="Follow up: tomorrow 10:00" />
                ) : (
                  <div className="h-14 rounded-lg border border-dashed border-border-strong" aria-hidden="true" />
                )}
                {col === "New" ? <div className="h-10 rounded-lg border border-dashed border-border-strong" aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Note added: &ldquo;Called — wants the quote by email. Needs the car by Friday morning.&rdquo; Every stage change is stored as history.
          </p>
        </Frame>
      );
    case 2:
      return (
        <Frame label="Preview: quotation with GST" title="Quotations · QUO-0047">
          <Lines lines={QUOTE_LINES} />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span id="pos-label">Customer is in:</span>
            <div role="group" aria-labelledby="pos-label" className="flex gap-1">
              {[
                { label: "Kerala (same state)", value: false },
                { label: "Karnataka (other state)", value: true },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={flags.interState === o.value}
                  onClick={() => set({ interState: o.value })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    flags.interState === o.value ? "border-accent-deep bg-accent-soft text-accent-deep" : "border-border-strong text-muted hover:bg-surface-2",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <dl className="mt-3 ml-auto flex max-w-64 flex-col gap-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(quote.subtotal)} />
            <TaxRows tax={quote.taxAmount} interState={flags.interState} />
            <Row label="Total" value={formatCurrency(quote.total)} strong />
          </dl>
          <p className="mt-2 text-xs text-faint">Lead moves to Quoted when you send it. Try switching the customer&apos;s state — the tax split follows.</p>
        </Frame>
      );
    case 3:
      return (
        <Frame label="Preview: customer's view of the quotation" title="yourbusiness.in/quote/…">
          <div className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="font-display font-bold">Malabar Drive &amp; Care</p>
            <p className="text-xs text-muted">Quotation QUO-0047 · for Anjali Menon</p>
            <p className="mt-3 flex justify-between font-mono">
              <span className="font-sans text-muted">Total</span>
              {formatCurrency(quote.total)}
            </p>
            {flags.accepted ? (
              <p role="status" className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-center text-sm text-accent-deep">
                Thanks — quotation accepted. We&apos;ll be in touch to confirm.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="accent" size="sm" onClick={() => set({ accepted: true })}>
                  Accept quotation
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled>
                  Request changes
                </Button>
              </div>
            )}
          </div>
          <div className={cn("mt-3 rounded-lg border px-3 py-2 text-xs", flags.accepted ? "border-accent-deep bg-accent-soft text-accent-deep" : "border-dashed border-border-strong text-faint")}>
            {flags.accepted ? "On your side: QUO-0047 is now Accepted, and you got a notification — Anjali Menon accepted QUO-0047." : "Press Accept to see what you receive."}
          </div>
        </Frame>
      );
    case 4: {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return (
        <Frame label="Preview: fleet calendar" title="Vehicles · calendar">
          <div className="overflow-x-auto">
            <div className="grid min-w-[480px] grid-cols-[6rem_repeat(7,1fr)] gap-y-1.5 text-xs">
              <span />
              {days.map((d) => (
                <span key={d} className="text-center font-mono text-faint">
                  {d}
                </span>
              ))}
              <span className="self-center font-mono">KL-07-CD-1337</span>
              <span className="col-span-4" />
              <span className="col-span-3 rounded-md bg-accent-soft px-2 py-1.5 text-center font-medium text-accent-deep">Anjali Menon</span>
              <span className="self-center font-mono">KL-07-BC-1200</span>
              <span className="col-span-3 rounded-md bg-accent-soft px-2 py-1.5 text-center font-medium text-accent-deep">R. Nair</span>
              <span className="col-span-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => set({ clash: !flags.clash })} aria-pressed={flags.clash}>
              {flags.clash ? "Hide the clash" : "Try to double-book the Creta"}
            </Button>
            <Pill tone="accent">Creta: Rented</Pill>
          </div>
          {flags.clash ? (
            <p role="alert" className="mt-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger">
              That vehicle is already booked for Anjali Menon (Friday to Sunday).
            </p>
          ) : null}
        </Frame>
      );
    }
    case 5:
      return (
        <Frame label="Preview: invoice that deducts stock" title="Invoices · new">
          <Lines lines={invLines} linked={FILTER_LINE.description} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="text-muted">Cabin air filter in stock:</span>{" "}
              <span className="font-mono font-semibold tabular-nums">{flags.invoiced ? 19 : 20}</span>
              {flags.invoiced ? <span className="ml-2 text-xs text-accent-deep">−1 recorded as usage</span> : null}
            </p>
            {flags.invoiced ? (
              <Pill tone="accent">INV-0048 created</Pill>
            ) : (
              <Button type="button" variant="accent" size="sm" onClick={() => set({ invoiced: true })}>
                Create invoice
              </Button>
            )}
          </div>
          <dl className="mt-3 ml-auto flex max-w-64 flex-col gap-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(inv.subtotal)} />
            <TaxRows tax={inv.taxAmount} interState={false} />
            <Row label="Total" value={formatCurrency(inv.total)} strong />
          </dl>
        </Frame>
      );
    case 6:
      return (
        <Frame label="Preview: paying an invoice" title="yourbusiness.in/invoice/…">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">Invoice INV-0048</p>
            <Pill tone={flags.paid ? "accent" : "neutral"}>{flags.paid ? "paid" : "partial"}</Pill>
          </div>
          <dl className="mt-3 flex max-w-72 flex-col gap-1.5 text-sm">
            <Row label="Total" value={formatCurrency(inv.total)} />
            <Row label="Advance (cash, at pickup)" value={formatCurrency(ADVANCE)} tone="accent" />
            {flags.paid ? <Row label="Paid online (UPI)" value={formatCurrency(balance)} tone="accent" /> : null}
            <Row label="Balance due" value={formatCurrency(flags.paid ? 0 : balance)} strong />
          </dl>
          {flags.paid ? (
            <p role="status" className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-deep">
              Recorded once against INV-0048 — even if the gateway sends the notification twice. Status is now Paid.
            </p>
          ) : (
            <div className="mt-3">
              <Button type="button" variant="accent" onClick={() => set({ paid: true })}>
                Pay {formatCurrency(balance)} now
              </Button>
              <p className="mt-1 text-xs text-faint">UPI, cards and netbanking via Razorpay.</p>
            </div>
          )}
        </Frame>
      );
    case 7:
      return (
        <Frame label="Preview: automatic service-due notification" title="Notifications · 90 days later">
          <div className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="flex items-center justify-between gap-2">
              <span className="font-medium">Anjali Menon is due for a service</span>
              <Pill>Service due</Pill>
            </p>
            <p className="mt-1 text-xs text-muted">It&apos;s been a while since their last visit — call or email them to book a slot.</p>
            <p className="mt-2 text-[0.65rem] text-faint">Created automatically at 3 AM</p>
          </div>
          <p className="mt-3 text-xs text-muted">Also handled for you every night:</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {["Follow-up due", "Stale lead", "Unpaid invoice", "Low stock", "Vehicle back to available"].map((t) => (
              <li key={t}>
                <Pill>{t}</Pill>
              </li>
            ))}
          </ul>
        </Frame>
      );
    default:
      return (
        <Frame label="Preview: reports" title="Reports · last 30 days">
          <p className="mb-2 text-xs font-medium text-muted">Sales funnel (from recorded stage changes)</p>
          <MiniBars
            rows={[
              { label: "New", value: 108 },
              { label: "Contacted", value: 91, note: "84%" },
              { label: "Quoted", value: 63, note: "69%" },
              { label: "Booked", value: 57, note: "90%" },
            ]}
          />
          <p className="mb-2 mt-4 text-xs font-medium text-muted">Who brought the bookings</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-faint">
                  <th className="pb-1 font-medium">Link</th>
                  <th className="pb-1 text-right font-medium">Clicks</th>
                  <th className="pb-1 text-right font-medium">Booked</th>
                  <th className="pb-1 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs tabular-nums">
                <tr className="border-b border-border">
                  <td className="py-1.5 font-sans text-sm">Reels with Arjun Travels</td>
                  <td className="text-right">188</td>
                  <td className="text-right">12</td>
                  <td className="text-right">{formatCurrency(3000)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-sans text-sm">Airport flyer QR</td>
                  <td className="text-right">64</td>
                  <td className="text-right">5</td>
                  <td className="text-right">{formatCurrency(1840)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Frame>
      );
  }
}

export function FlowSimulator() {
  const [index, setIndex] = useState(0);
  const [flags, setFlags] = useState<Flags>(INITIAL);
  const step = FLOW[index];
  const set = (patch: Partial<Flags>) => setFlags((f) => ({ ...f, ...patch }));

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <nav aria-label="Flow steps">
        <ol className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
          {FLOW.map((s, i) => {
            const current = i === index;
            return (
              <li key={s.id} className="shrink-0 snap-start lg:shrink">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    current ? "bg-accent-soft text-accent-deep" : "text-muted hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-6 flex-none items-center justify-center rounded-full font-mono text-xs",
                      i < index ? "bg-accent text-accent-ink" : current ? "bg-accent-deep text-white" : "border border-border-strong",
                    )}
                  >
                    {i < index ? "✓" : i + 1}
                  </span>
                  <span className="whitespace-nowrap lg:whitespace-normal">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0">
        <p className="sr-only" role="status" aria-live="polite">
          Step {index + 1} of {FLOW.length}: {step.title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-faint">
            Step {index + 1} of {FLOW.length}
          </span>
          <Pill tone={step.who === "Automatic" ? "accent" : "neutral"}>
            {step.who === "Automatic" ? "Happens automatically" : step.who === "You" ? "You do this" : "The customer does this"}
          </Pill>
        </div>
        <h2 className="mt-2 font-display text-xl font-bold text-balance">{step.headline}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{step.body}</p>

        <div className="mt-4">
          <Preview index={index} flags={flags} set={set} />
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <h3 className="font-display text-sm font-bold">What the product does for you</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
            {step.automatic.map((a) => (
              <li key={a} className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            Back
          </Button>
          {index < FLOW.length - 1 ? (
            <Button type="button" variant="accent" onClick={() => setIndex((i) => i + 1)}>
              Next: {FLOW[index + 1].title}
            </Button>
          ) : (
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                setIndex(0);
                setFlags(INITIAL);
              }}
            >
              Start over
            </Button>
          )}
          <ButtonLink href={step.href} variant="ghost">
            {step.cta} →
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
