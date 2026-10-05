import { AuthCard } from "@/components/layout/auth-card";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Set a new password" };

// Requires a session (not in PUBLIC_PATHS): the emailed link goes through
// /auth/callback, which signs the person in before sending them here.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const isInvite = welcome === "1";

  return (
    <AuthCard
      title={isInvite ? "Welcome to the team" : "Choose a new password"}
      subtitle={isInvite ? "Set a password to finish joining your workspace." : undefined}
    >
      <PasswordForm submitLabel={isInvite ? "Set password and continue" : "Update password"} />
    </AuthCard>
  );
}
