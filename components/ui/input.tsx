import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground placeholder:text-faint outline-none transition-colors focus:border-accent-deep focus:ring-2 focus:ring-accent-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint outline-none transition-colors focus:border-accent-deep focus:ring-2 focus:ring-accent-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-accent-deep focus:ring-2 focus:ring-accent-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium uppercase tracking-wide text-faint", className)}
      {...props}
    />
  );
}
