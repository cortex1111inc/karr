import { Frame, LeadCard, Pill, Row } from "@/components/preview/mocks";

// An illustration of the product with made-up data — never real customers.
export function HeroPreview() {
  const kpis = [
    { label: "Leads this month", value: "108" },
    { label: "Booked", value: "57" },
    { label: "Collected", value: "₹3.4 lakh" },
  ];
  return (
    <div>
      <p className="sr-only">Illustration of the Drivestead dashboard, lead pipeline and an invoice, using sample data.</p>
      <div aria-hidden="true">
        <Frame label="Sample dashboard" title="drivestead.app/app/dashboard" className="shadow-[0_24px_60px_-24px_rgba(30,26,10,0.35)]">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-lg border border-border bg-surface p-2.5 sm:p-3">
                <p className="font-mono text-base tabular-nums sm:text-lg">{k.value}</p>
                <p className="mt-0.5 text-[0.65rem] text-muted sm:text-xs">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-2 p-2">
              <p className="px-1 pb-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-faint">Needs a reply today</p>
              <div className="flex flex-col gap-2">
                <LeadCard name="Anjali Menon" stage="Quoted" note="Creta · Fri–Sun · airport pickup" />
                <LeadCard name="Rahul Nair" stage="Contacted" note="Full service + wheel alignment" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold">Invoice INV-0048</p>
                <Pill tone="accent">partial</Pill>
              </div>
              <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                <Row label="Subtotal" value="₹11,590.00" />
                <Row label="CGST (9%)" value="₹1,043.10" />
                <Row label="SGST (9%)" value="₹1,043.10" />
                <Row label="Total" value="₹13,676.20" strong />
                <Row label="Balance due" value="₹9,676.20" tone="danger" />
              </dl>
              <p className="mt-3 rounded-md bg-accent px-3 py-2 text-center text-xs font-medium text-accent-ink">Pay ₹9,676.20 now</p>
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}
