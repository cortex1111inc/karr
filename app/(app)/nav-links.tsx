"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/customers", label: "Customers" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/inventory", label: "Inventory" },
  { href: "/quotations", label: "Quotations" },
  { href: "/invoices", label: "Invoices" },
  { href: "/reports", label: "Reports" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/notifications", label: "Notifications" },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const showBadge = link.href === "/notifications" && unreadCount > 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-accent-deep" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <span>{link.label}</span>
            {showBadge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[0.68rem] font-semibold text-accent-ink">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
