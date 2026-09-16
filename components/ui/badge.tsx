import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const TONES = {
  neutral: "bg-surface-2 text-muted border-border",
  accent: "bg-accent-soft text-accent-deep border-accent-soft",
  danger: "bg-danger-soft text-danger border-danger-soft",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: keyof typeof TONES } & ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
