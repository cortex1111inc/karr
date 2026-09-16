"use client";

import { useActionState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addLeadNote } from "../actions";

type Activity = {
  id: string;
  kind: "note" | "stage_change" | "call" | "whatsapp";
  body: string;
  createdAt: Date;
  authorName: string | null;
};

const initialState: { error: string | null } = { error: null };

const KIND_LABEL: Record<Activity["kind"], string> = {
  note: "Note",
  stage_change: "Stage change",
  call: "Call",
  whatsapp: "WhatsApp",
};

export function ActivityTimeline({ leadId, activities }: { leadId: string; activities: Activity[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(addLeadNote.bind(null, leadId), initialState);

  useEffect(() => {
    if (state.error === null && !pending) formRef.current?.reset();
  }, [state, pending]);

  return (
    <Card className="p-5">
      <h2 className="font-display text-sm font-bold">Activity</h2>

      <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-2">
        <Textarea name="body" rows={2} placeholder="Log a call, add a note…" required />
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        <div>
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add note"}
          </Button>
        </div>
      </form>

      <ol className="mt-5 flex flex-col gap-4 border-t border-border pt-4">
        {activities.length === 0 ? (
          <p className="text-sm text-faint">No activity yet.</p>
        ) : (
          activities.map((activity) => (
            <li key={activity.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.68rem] uppercase tracking-wide text-faint">
                  {KIND_LABEL[activity.kind]}
                </span>
                <span className="text-xs text-faint">
                  {activity.createdAt.toLocaleString()} {activity.authorName ? `· ${activity.authorName}` : ""}
                </span>
              </div>
              <p className="mt-1 text-foreground">{activity.body}</p>
            </li>
          ))
        )}
      </ol>
    </Card>
  );
}
