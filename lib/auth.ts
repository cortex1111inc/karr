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

  if (!profile) {
    redirect("/login?error=no-profile");
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    orgId: profile.orgId,
  };
}
