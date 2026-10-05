import { cn } from "@/lib/utils";

// Period-over-period change for a KPI. `invert` for metrics where down is
// good (e.g. overdue amounts).
export function Delta({
  current,
  previous,
  format = (n: number) => String(n),
  invert = false,
}: {
  current: number;
  previous: number;
  format?: (n: number) => string;
  invert?: boolean;
}) {
  if (previous === 0 && current === 0) return <span className="text-xs text-faint">No change</span>;
  if (previous === 0) return <span className="text-xs text-accent-deep">New this period</span>;
  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;
  const good = invert ? !up : up;
  return (
    <span className={cn("text-xs", good ? "text-accent-deep" : "text-danger")}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Up" : "Down"}</span> {Math.abs(change).toFixed(0)}%{" "}
      <span className="text-faint">vs {format(previous)}</span>
    </span>
  );
}
