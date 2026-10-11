"use client";

import Link from "next/link";
import { useState } from "react";
import { FEATURES, FEATURE_GROUPS, type FeatureGroup } from "@/lib/guide-content";
import { cn } from "@/lib/utils";
import { Pill } from "./mocks";

export function FeatureExplorer({ isOwner }: { isOwner: boolean }) {
  const [group, setGroup] = useState<FeatureGroup | "All">("All");
  const [open, setOpen] = useState<string | null>(null);
  const shown = FEATURES.filter((f) => group === "All" || f.group === group);

  return (
    <div>
      <div role="group" aria-label="Filter features" className="flex flex-wrap gap-2">
        {(["All", ...FEATURE_GROUPS] as const).map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            onClick={() => setGroup(g)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              group === g ? "border-accent-deep bg-accent-soft text-accent-deep" : "border-border-strong text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {g}
          </button>
        ))}
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((f) => {
          const expanded = open === f.id;
          return (
            <li key={f.id} className={cn("rounded-xl border bg-surface", expanded ? "border-accent-deep" : "border-border")}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`feature-${f.id}`}
                onClick={() => setOpen(expanded ? null : f.id)}
                className="flex w-full items-start justify-between gap-3 rounded-xl p-4 text-left"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold">{f.title}</span>
                    <Pill>{f.group}</Pill>
                    {f.ownerOnly ? <Pill tone="accent">Owner</Pill> : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{f.summary}</span>
                </span>
                <span aria-hidden="true" className={cn("mt-1 text-faint transition-transform", expanded && "rotate-90")}>
                  ›
                </span>
              </button>
              {expanded ? (
                <div id={`feature-${f.id}`} className="border-t border-border px-4 pb-4 pt-3">
                  <ul className="flex flex-col gap-1.5 text-sm text-muted">
                    {f.details.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                        {d}
                      </li>
                    ))}
                  </ul>
                  {f.ownerOnly && !isOwner ? (
                    <p className="mt-3 text-xs text-faint">Only the workspace owner can use this part.</p>
                  ) : (
                    <Link href={f.href} className="mt-3 inline-block text-sm font-medium text-accent-deep hover:underline">
                      Open {f.title.toLowerCase()} →
                    </Link>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
