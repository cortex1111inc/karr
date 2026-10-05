"use client";

import { useRef } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NavLinks, UnreadBadge } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

type ShellUser = { fullName: string; email: string };

function SidebarBody({ user, unreadCount, onNavigate }: { user: ShellUser; unreadCount: number; onNavigate?: () => void }) {
  return (
    <>
      <NavLinks unreadCount={unreadCount} onNavigate={onNavigate} />
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-2 pt-4">
        <Link href="/settings/account" onClick={onNavigate} className="min-w-0 rounded-md hover:bg-surface-2">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-faint">{user.email}</p>
        </Link>
        <SignOutButton />
      </div>
    </>
  );
}

// Desktop (lg+): a sticky sidebar. Below lg: a top bar, with navigation in
// a native <dialog> drawer — which brings focus trapping, Escape-to-close
// and a backdrop for free.
export function AppShell({
  user,
  unreadCount,
  children,
}: {
  user: ShellUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const close = () => drawerRef.current?.close();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background lg:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-60 flex-none flex-col gap-6 overflow-y-auto border-r border-border bg-surface px-4 py-5 lg:flex">
        <Link href="/dashboard" className="px-2">
          <Logo />
        </Link>
        <SidebarBody user={user} unreadCount={unreadCount} />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-surface px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:hidden">
        <button
          type="button"
          onClick={() => drawerRef.current?.showModal()}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-2"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-2"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" strokeLinejoin="round" />
            <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
          </svg>
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1">
              <UnreadBadge count={unreadCount} />
            </span>
          ) : null}
        </Link>
      </header>

      <dialog
        ref={drawerRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-0 border-r border-border bg-surface p-0 text-foreground backdrop:bg-black/30"
        onClick={(e) => {
          if (e.target === drawerRef.current) close(); // backdrop click
        }}
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
          <div className="flex items-center justify-between px-2">
            <Logo />
            <button
              type="button"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <SidebarBody user={user} unreadCount={unreadCount} onNavigate={close} />
        </div>
      </dialog>

      <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
        {children}
      </main>
    </div>
  );
}
