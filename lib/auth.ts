import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: "owner" | "staff";
  orgId: string;
};

// Every authenticated page/action that touches org data should start with
// this. It resolves the Supabase auth user to their `profiles` row (which
// carries orgId) and redirects to /login if either is missing — middleware
// already guards routes, but this is the source of truth queries rely on.
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  // Signed in but no workspace yet (e.g. just confirmed their signup email).
  if (!profile) {
    redirect("/onboarding");
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    orgId: profile.orgId,
  };
}

// For destructive actions on financial/customer/asset records. The UI hides
// these controls from staff too; this is the server-side enforcement.
export async function requireOwner(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "owner") {
    throw new Error("Only the workspace owner can do that.");
  }
  return user;
}
