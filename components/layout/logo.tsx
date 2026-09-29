import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-md bg-foreground", className)}>
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden="true">
        <path
          d="M3 13.5L5.2 7.8C5.5 7 6.3 6.5 7.2 6.5H16.8C17.7 6.5 18.5 7 18.8 7.8L21 13.5"
          stroke="var(--background)"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="2.5" y="13.5" width="19" height="5" rx="1.6" stroke="var(--background)" strokeWidth="1.7" />
        <circle cx="7" cy="18.5" r="1.3" fill="var(--background)" />
        <circle cx="17" cy="18.5" r="1.3" fill="var(--background)" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-sm font-bold">Vanspire OS</span>
    </span>
  );
}
