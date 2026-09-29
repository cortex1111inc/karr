import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { safeNextPath } from "@/lib/redirects";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or request a new one.",
};

const NOTICES: Record<string, string> = {
  "password-updated": "Password updated — sign in with your new password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const error = params.error ? ERRORS[params.error] : undefined;
  const notice = params.notice ? NOTICES[params.notice] : undefined;

  return (
    <AuthCard title="Vanspire OS" subtitle="Sign in to your workspace">
      {error ? (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-deep">{notice}</p> : null}
      <LoginForm next={next} />
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-foreground">
          Forgot your password?
        </Link>
        <p className="text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent-deep hover:underline">
            Create a workspace
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
