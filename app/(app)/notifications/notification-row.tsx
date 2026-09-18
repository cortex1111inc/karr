"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markNotificationRead } from "./actions";

const KIND_LABEL: Record<string, string> = {
  follow_up_due: "Follow-up due",
  stale_lead: "Stale lead",
  service_due: "Service due",
  low_stock: "Low stock",
  system: "System",
};

export function NotificationRow({
  notification,
}: {
  notification: {
    id: string;
    kind: string;
    title: string;
    body: string;
    link: string | null;
    readAt: Date | null;
    createdAt: Date;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const isUnread = !notification.readAt;

  return (
    <div className={`flex items-start justify-between gap-3 p-4 ${isUnread ? "bg-accent-soft/40" : ""}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge tone={isUnread ? "accent" : "neutral"}>{KIND_LABEL[notification.kind] ?? notification.kind}</Badge>
          <span className="text-xs text-faint">{notification.createdAt.toLocaleString()}</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold">{notification.title}</p>
        <p className="mt-0.5 text-sm text-muted">{notification.body}</p>
        {notification.link ? (
          <Link
            href={notification.link}
            className="mt-1.5 inline-block text-sm font-medium text-accent-deep hover:underline"
            onClick={() => {
              if (isUnread) startTransition(() => markNotificationRead(notification.id));
            }}
          >
            View →
          </Link>
        ) : null}
      </div>
      {isUnread ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => markNotificationRead(notification.id))}
        >
          Mark read
        </Button>
      ) : null}
    </div>
  );
}
