"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GuideTab = "flow" | "features" | "setup";

const TABS: { id: GuideTab; label: string }[] = [
  { id: "flow", label: "How it works" },
  { id: "features", label: "Everything it does" },
  { id: "setup", label: "Set up your workspace" },
];

// All three panels stay mounted (just hidden), so the walkthrough keeps its
// place while someone peeks at the setup checklist and comes back.
export function GuideTabs({ initial, flow, features, setup }: { initial: GuideTab; flow: ReactNode; features: ReactNode; setup: ReactNode }) {
  const [tab, setTab] = useState<GuideTab>(initial);

  function choose(id: GuideTab) {
    setTab(id);
    window.history.replaceState(null, "", `?tab=${id}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    choose(TABS[next].id);
    document.getElementById(`guide-tab-${TABS[next].id}`)?.focus();
  }

  const panels: Record<GuideTab, ReactNode> = { flow, features, setup };

  return (
    <div>
      <div role="tablist" aria-label="Guide sections" onKeyDown={onKeyDown} className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              id={`guide-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`guide-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(t.id)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                selected ? "border-accent-deep text-accent-deep" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {TABS.map((t) => (
        <div key={t.id} id={`guide-panel-${t.id}`} role="tabpanel" aria-labelledby={`guide-tab-${t.id}`} hidden={t.id !== tab} className="pt-6">
          {panels[t.id]}
        </div>
      ))}
    </div>
  );
}
