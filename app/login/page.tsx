import { LoginForm } from "./login-form";
import { Card } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/dashboard";

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface-2 px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 13.5L5.2 7.8C5.5 7 6.3 6.5 7.2 6.5H16.8C17.7 6.5 18.5 7 18.8 7.8L21 13.5" stroke="var(--background)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="2.5" y="13.5" width="19" height="5" rx="1.6" stroke="var(--background)" strokeWidth="1.7" />
              <circle cx="7" cy="18.5" r="1.3" fill="var(--background)" />
              <circle cx="17" cy="18.5" r="1.3" fill="var(--background)" />
            </svg>
          </span>
          <h1 className="font-display text-xl font-bold">Vanspire OS</h1>
          <p className="text-sm text-muted">Sign in to your workspace</p>
        </div>
        <Card className="p-6">
          <LoginForm next={next} />
          {params.error === "no-profile" ? (
            <p className="mt-4 text-xs text-danger">
              Your account isn&apos;t linked to a workspace yet. Contact your admin.
            </p>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
