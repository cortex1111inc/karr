import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

// A "D" with a hub-dot counter: the dot reads as a wheel or headlight, the
// letter as "drive". Same artwork as public/brand/drivestead-mark.svg and
// app/icon.svg — keep the three in step.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-7 w-7 flex-none", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={BRAND.green} />
      <path
        fill="#ffffff"
        fillRule="evenodd"
        d="M19 14H33C45.5 14 53 22.2 53 32S45.5 50 33 50H19ZM28 22.5H32.5C38.4 22.5 42.5 26.4 42.5 32S38.4 41.5 32.5 41.5H28Z"
      />
      <circle cx="35" cy="32" r="4.2" fill={BRAND.lime} />
    </svg>
  );
}

export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={size === "lg" ? "h-9 w-9" : undefined} />
      <span className={cn("font-display font-bold tracking-tight", size === "lg" ? "text-xl" : "text-sm")}>
        Drive<span className="text-accent-deep">stead</span>
      </span>
    </span>
  );
}
