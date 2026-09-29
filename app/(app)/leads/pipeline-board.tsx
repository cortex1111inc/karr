"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import type { leads } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { LEAD_STAGES as STAGES, SOURCE_LABEL as SOURCE_LABELS } from "@/lib/leads";
import { updateLeadStage } from "./actions";

type Lead = InferSelectModel<typeof leads>;

export function PipelineBoard({ leads }: { leads: Lead[] }) {
  return (
    // Below xl: horizontally scrolling columns that snap one at a time (thumb-
    // friendly on phones). xl+: all five stages side by side.
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 xl:grid xl:grid-cols-5 xl:overflow-visible xl:pb-0">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage.value);
        return (
          <section
            key={stage.value}
            aria-label={`${stage.label} (${stageLeads.length})`}
            className="flex w-[82vw] max-w-xs shrink-0 snap-start flex-col gap-3 sm:w-72 xl:w-auto xl:max-w-none"
          >
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs uppercase tracking-wide text-faint">{stage.label}</span>
              <span className="font-mono text-xs tabular-nums text-faint">{stageLeads.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {stageLeads.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-faint">
                  No leads here
                </p>
              ) : (
                stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function followUpTone(followUpAt: Date | null): { label: string; tone: "danger" | "accent" } | null {
  if (!followUpAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(followUpAt);
  due.setHours(0, 0, 0, 0);

  if (due < today) return { label: "Overdue", tone: "danger" };
  if (due.getTime() === today.getTime()) return { label: "Due today", tone: "accent" };
  return null;
}

function LeadCard({ lead }: { lead: Lead }) {
  const [isPending, startTransition] = useTransition();
  const followUp = followUpTone(lead.followUpAt);

  return (
    <Card className="p-3.5">
      <Link href={`/leads/${lead.id}`} className="text-sm font-semibold hover:text-accent-deep">
        {lead.contactName}
      </Link>
      <p className="mt-0.5 text-xs text-muted">{lead.interest}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.68rem] text-faint">{SOURCE_LABELS[lead.source]}</span>
        <span className="font-mono text-[0.68rem] text-faint">{lead.contactPhone}</span>
      </div>
      {followUp ? (
        <Badge tone={followUp.tone} className="mt-2.5">
          {followUp.label}
        </Badge>
      ) : null}
      <Select
        className="mt-3 h-8 text-xs"
        value={lead.stage}
        disabled={isPending}
        aria-label={`Move ${lead.contactName} to a different stage`}
        onChange={(event) => {
          const nextStage = event.target.value as Lead["stage"];
          startTransition(() => {
            updateLeadStage(lead.id, nextStage);
          });
        }}
      >
        {STAGES.map((stage) => (
          <option key={stage.value} value={stage.value}>
            {stage.label}
          </option>
        ))}
      </Select>
    </Card>
  );
}
