"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { dismissOnboarding } from "./actions";

export type Step = { label: string; description: string; href: string; done: boolean };

export function GettingStarted({ steps, canDismiss }: { steps: Step[]; canDismiss: boolean }) {
  const [isPending, startTransition] = useTransition();
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold">Get set up</h2>
          <p className="mt-0.5 text-sm text-muted">
            {doneCount} of {steps.length} done
          </p>
        </div>
        {canDismiss ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => dismissOnboarding())}
            className="text-sm text-muted hover:text-foreground disabled:opacity-50"
          >
            Hide
          </button>
        ) : null}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2 hover:bg-surface-2"
              aria-label={`${step.label}${step.done ? " (done)" : ""}`}
            >
              <span
                className={
                  step.done
                    ? "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent text-xs text-accent-ink"
                    : "mt-0.5 h-5 w-5 flex-none rounded-full border-2 border-border-strong"
                }
                aria-hidden="true"
              >
                {step.done ? "✓" : null}
              </span>
              <span className="min-w-0">
                <span className={step.done ? "block text-sm text-faint line-through" : "block text-sm font-medium"}>{step.label}</span>
                {!step.done ? <span className="block text-xs text-muted">{step.description}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
