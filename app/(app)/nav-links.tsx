"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

const GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/notifications", label: "Notifications" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/leads", label: "Leads" },
      { href: "/customers", label: "Customers" },
      { href: "/quotations", label: "Quotations" },
      { href: "/invoices", label: "Invoices" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/vehicles", label: "Vehicles" },
      { href: "/inventory", label: "Inventory" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/growth", label: "Growth" },
      { href: "/growth/links", label: "Tracking links" },
      { href: "/growth/website", label: "Website" },
      { href: "/campaigns", label: "Campaigns" },
      { href: "/reports", label: "Reports" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/integrations", label: "Integrations" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

const ALL_HREFS = GROUPS.flatMap((g) => g.items.map((i) => i.href));

// Longest matching prefix wins, so /growth/links highlights "Tracking links"
// rather than also lighting up its parent "Growth".
function activeHref(pathname: string): string | undefined {
  return ALL_HREFS.filter((h) => pathname === h || pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
}

export function NavLinks({ unreadCount, onNavigate }: { unreadCount: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeHref(pathname);

  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {GROUPS.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-0.5">
          {group.label ? (
            <p className="px-3 pb-1 font-mono text-[0.65rem] uppercase tracking-wider text-faint">{group.label}</p>
          ) : null}
          {group.items.map((link) => {
            const active = link.href === current;
            const showBadge = link.href === "/notifications" && unreadCount > 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep",
                  active ? "bg-accent-soft text-accent-deep" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <span>{link.label}</span>
                {showBadge ? <UnreadBadge count={unreadCount} /> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[0.68rem] font-semibold text-accent-ink">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}
