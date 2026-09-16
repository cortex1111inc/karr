"use client";

import { useTransition } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { leads } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { updateLeadStage } from "./actions";

type Lead = InferSelectModel<typeof leads>;

const STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
] as const;

const SOURCE_LABELS: Record<Lead["source"], string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  call: "Call",
  website: "Website",
  walk_in: "Walk-in",
  referral: "Referral",
  other: "Other",
};

export function PipelineBoard({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid min-w-[1000px] grid-cols-5 gap-4">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage.value);
        return (
          <div key={stage.value} className="flex flex-col gap-3">
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
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="p-3.5">
      <p className="text-sm font-semibold">{lead.contactName}</p>
      <p className="mt-0.5 text-xs text-muted">{lead.interest}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.68rem] text-faint">{SOURCE_LABELS[lead.source]}</span>
        <span className="font-mono text-[0.68rem] text-faint">{lead.contactPhone}</span>
      </div>
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
