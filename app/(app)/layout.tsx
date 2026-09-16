import { requireUser } from "@/lib/auth";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="flex w-60 flex-none flex-col gap-6 border-r border-border bg-surface px-4 py-5">
        <div className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 13.5L5.2 7.8C5.5 7 6.3 6.5 7.2 6.5H16.8C17.7 6.5 18.5 7 18.8 7.8L21 13.5" stroke="var(--background)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="2.5" y="13.5" width="19" height="5" rx="1.6" stroke="var(--background)" strokeWidth="1.7" />
              <circle cx="7" cy="18.5" r="1.3" fill="var(--background)" />
              <circle cx="17" cy="18.5" r="1.3" fill="var(--background)" />
            </svg>
          </span>
          <span className="font-display text-sm font-bold">Vanspire OS</span>
        </div>

        <NavLinks />

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-2 pt-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-faint">{user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
