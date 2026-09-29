"use client";

import "./globals.css";

// Replaces the root layout when it fails, so it brings its own <html>/<body>
// and can't rely on anything the root layout would normally provide.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-foreground">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold">Vanspire OS is having trouble</h1>
          <p className="mt-2 text-sm text-muted">Something went wrong loading the app. Please try again.</p>
          {error.digest ? <p className="mt-2 font-mono text-xs text-faint">Ref: {error.digest}</p> : null}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
