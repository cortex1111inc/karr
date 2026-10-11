import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Small presentational pieces that imitate the real screens, used by the
// interactive flow preview. They are illustrations: nothing here reads or
// writes workspace data.

export function Frame({ label, title, children, className }: { label: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("overflow-hidden rounded-xl border border-border-strong bg-background", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-border-strong" />
          <span className="h-2 w-2 rounded-full bg-border-strong" />
          <span className="h-2 w-2 rounded-full bg-border-strong" />
        </span>
        <span className="truncate font-mono text-[0.7rem] text-faint">{title}</span>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function Bubble({ from, children, meta }: { from: "customer" | "business"; children: ReactNode; meta?: string }) {
  const mine = from === "business";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          mine ? "rounded-br-sm bg-accent-soft text-foreground" : "rounded-bl-sm border border-border bg-surface",
        )}
      >
        {children}
        {meta ? <p className="mt-1 text-[0.65rem] text-faint">{meta}</p> : null}
      </div>
    </div>
  );
}

const STAGE_TONE: Record<string, string> = {
  New: "bg-surface-2 text-muted",
  Contacted: "bg-surface-2 text-muted",
  Quoted: "bg-accent-soft text-accent-deep",
  Booked: "bg-accent text-accent-ink",
  Lost: "bg-danger-soft text-danger",
};

export function StageChip({ stage }: { stage: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", STAGE_TONE[stage] ?? STAGE_TONE.New)}>{stage}</span>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "danger" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[0.7rem] font-medium",
        tone === "accent" && "border-accent-soft bg-accent-soft text-accent-deep",
        tone === "danger" && "border-danger-soft bg-danger-soft text-danger",
        tone === "neutral" && "border-border bg-surface-2 text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function LeadCard({ name, note, stage, source, highlight }: { name: string; note: string; stage: string; source?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border bg-surface p-3 text-sm shadow-[0_1px_2px_rgba(30,26,10,0.05)]", highlight ? "border-accent-deep ring-2 ring-accent-soft" : "border-border")}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{name}</p>
        <StageChip stage={stage} />
      </div>
      <p className="mt-1 text-xs text-muted">{note}</p>
      {source ? <p className="mt-2 font-mono text-[0.65rem] text-faint">{source}</p> : null}
    </div>
  );
}

export function Row({ label, value, strong, tone }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: "accent" | "danger" }) {
  return (
    <div className={cn("flex justify-between gap-6", strong && "border-t border-border pt-1.5 text-base font-semibold")}>
      <dt className={strong ? undefined : "text-muted"}>{label}</dt>
      <dd className={cn("font-mono tabular-nums", tone === "accent" && "text-accent-deep", tone === "danger" && "text-danger")}>{value}</dd>
    </div>
  );
}

export function MiniBars({ rows }: { rows: { label: string; value: number; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 text-muted">{r.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-surface-2" aria-hidden="true">
            <div className="h-full rounded bg-accent" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums">
            {r.value}
            {r.note ? <span className="text-faint"> · {r.note}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
