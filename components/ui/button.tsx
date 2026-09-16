import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-foreground text-background hover:opacity-90",
  accent: "bg-accent text-accent-ink hover:brightness-105",
  ghost: "bg-transparent border border-border-strong text-foreground hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
} as const;

type BaseProps = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: BaseProps & ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[transform,box-shadow,background,border-color] duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[transform,box-shadow,background,border-color] duration-150 ease-out",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
