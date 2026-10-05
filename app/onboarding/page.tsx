import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/layout/auth-card";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your workspace" };

// Reached when someone is signed in but has no workspace yet — typically
// right after confirming their signup email. Deliberately not using
// requireUser(), which is what redirects here in the first place.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (profile) redirect("/dashboard");

  const meta = (user.user_metadata ?? {}) as { full_name?: string; business_name?: string };

  return (
    <AuthCard title="Almost there" subtitle="Confirm your details and we'll open your workspace.">
      <OnboardingForm fullName={meta.full_name ?? ""} businessName={meta.business_name ?? ""} />
    </AuthCard>
  );
}
