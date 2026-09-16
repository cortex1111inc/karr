import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(30,26,10,0.05)]",
        className,
      )}
      {...props}
    />
  );
}
