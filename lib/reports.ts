// Pure report calculations (no DB) so they're unit-testable. Pages fetch
// the rows once and aggregate here — see CLAUDE.md on JS aggregation.

export const FUNNEL_STAGES = ["new", "contacted", "quoted", "booked"] as const;
type FunnelStage = (typeof FUNNEL_STAGES)[number];
const RANK: Record<string, number> = { new: 0, contacted: 1, quoted: 2, booked: 3 };

export type StageChange = { leadId: string; toStage: string; changedAt: Date };

// Point-in-time funnel from stage history: a lead counts for every stage up
// to the furthest one it reached within the period ("reached at least").
// Lost is excluded — it isn't a step forward.
export function funnel(changes: StageChange[]): { stage: FunnelStage; count: number; rate: number }[] {
  const furthest = new Map<string, number>();
  for (const c of changes) {
    const rank = RANK[c.toStage];
    if (rank === undefined) continue;
    furthest.set(c.leadId, Math.max(furthest.get(c.leadId) ?? -1, rank));
  }
  const counts = FUNNEL_STAGES.map((_, i) => [...furthest.values()].filter((r) => r >= i).length);
  return FUNNEL_STAGES.map((stage, i) => ({
    stage,
    count: counts[i],
    // Share of the previous step that made it here.
    rate: i === 0 ? 100 : counts[i - 1] > 0 ? (counts[i] / counts[i - 1]) * 100 : 0,
  }));
}

// Median days from lead creation to its first "booked" change.
export function medianDaysToBook(rows: { createdAt: Date; bookedAt: Date }[]): number | null {
  if (rows.length === 0) return null;
  const days = rows.map((r) => (r.bookedAt.getTime() - r.createdAt.getTime()) / 86_400_000).sort((a, b) => a - b);
  const mid = Math.floor(days.length / 2);
  return days.length % 2 ? days[mid] : (days[mid - 1] + days[mid]) / 2;
}

export type AgingBucket = { label: string; amount: number; count: number };

// Outstanding balance on sent/partial invoices by age since issue.
export function receivablesAging(rows: { total: string | number; amountPaid: string | number; createdAt: Date }[], now = new Date()): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: "0–30 days", amount: 0, count: 0 },
    { label: "31–60 days", amount: 0, count: 0 },
    { label: "60+ days", amount: 0, count: 0 },
  ];
  for (const r of rows) {
    const due = Math.round((Number(r.total) - Number(r.amountPaid)) * 100) / 100;
    if (due <= 0) continue;
    const age = (now.getTime() - r.createdAt.getTime()) / 86_400_000;
    const b = buckets[age <= 30 ? 0 : age <= 60 ? 1 : 2];
    b.amount = Math.round((b.amount + due) * 100) / 100;
    b.count += 1;
  }
  return buckets;
}

// % change vs the previous period; null when there's no baseline.
export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Local-date week bucket key (Monday start), YYYY-MM-DD.
export function weekKey(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD for exports; both optional.
export function parseDateRange(fromRaw: string | null, toRaw: string | null): { from: Date | null; to: Date | null } | { error: string } {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const from = fromRaw ? (re.test(fromRaw) ? new Date(`${fromRaw}T00:00:00`) : null) : null;
  const to = toRaw ? (re.test(toRaw) ? new Date(`${toRaw}T23:59:59.999`) : null) : null;
  if ((fromRaw && (!from || Number.isNaN(from.getTime()))) || (toRaw && (!to || Number.isNaN(to.getTime())))) {
    return { error: "Dates must be YYYY-MM-DD." };
  }
  if (from && to && to < from) return { error: "The end date is before the start date." };
  return { from, to };
}
