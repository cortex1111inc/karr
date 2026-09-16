"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/customers", label: "Customers" },
  { href: "/settings/team", label: "Team" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-accent-deep" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
