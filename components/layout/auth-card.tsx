import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/layout/logo";

// Shared frame for the signed-out pages (login, signup, password reset, onboarding).
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface-2 px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <LogoMark className="h-9 w-9 rounded-lg" />
          <h1 className="font-display text-xl font-bold text-balance">{title}</h1>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
        <Card className="p-6">{children}</Card>
      </div>
    </main>
  );
}
