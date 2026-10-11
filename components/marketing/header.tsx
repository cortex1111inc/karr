import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#trust", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Drivestead home">
          <Logo />
        </Link>
        <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <ButtonLink href="/app/dashboard" variant="accent" size="sm">
              Open your workspace
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                Sign in
              </Link>
              <ButtonLink href="/signup" variant="accent" size="sm">
                Create workspace
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
