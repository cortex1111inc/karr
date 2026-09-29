"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-lg font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          This page hit an unexpected error. Try again — if it keeps happening, the reference below helps us find it.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-faint">Ref: {error.digest}</p> : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="accent" size="sm" onClick={() => retry()}>
            Try again
          </Button>
          <Link href="/dashboard" className="inline-flex h-8 items-center px-3 text-sm font-medium text-muted hover:text-foreground">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
