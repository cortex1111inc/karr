import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface-2 px-4 py-16">
      <div className="max-w-sm text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-faint">404</p>
        <h1 className="mt-1 font-display text-xl font-bold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-muted">
          The link may be mistyped, or what it pointed to was removed. If someone shared it with you, ask them for a
          fresh link.
        </p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background">
          Go home
        </Link>
      </div>
    </main>
  );
}
