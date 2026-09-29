import Link from "next/link";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 50;

// Reads ?page= safely: anything missing/invalid becomes 1.
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// Server component. Keeps every other query param (search, filters) intact.
export function Pagination({
  page,
  pageSize = PAGE_SIZE,
  total,
  pathname,
  searchParams = {},
}: {
  page: number;
  pageSize?: number;
  total: number;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const linkClass = "inline-flex h-8 items-center rounded-lg border border-border-strong px-3 text-sm font-medium";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-faint">
        {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cn(linkClass, "hover:bg-surface-2")}>
            ← Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(linkClass, "text-faint opacity-50")}>
            ← Previous
          </span>
        )}
        {page < pageCount ? (
          <Link href={href(page + 1)} className={cn(linkClass, "hover:bg-surface-2")}>
            Next →
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(linkClass, "text-faint opacity-50")}>
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
