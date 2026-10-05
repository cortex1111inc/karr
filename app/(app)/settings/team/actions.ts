"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site";
import { audit } from "@/lib/audit";

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  fullName: z.string().trim().min(1, "Name is required"),
  role: z.enum(["owner", "staff"]),
});

export async function inviteTeammate(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  if (user.role !== "owner") {
    return { error: "Only the workspace owner can invite teammates." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const admin = createAdminClient();
  // The emailed link signs them in via /auth/callback, then lands on the
  // "set your password" screen rather than the generic login page.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password?welcome=1")}`,
  });

  if (error) {
    return {
      error: /already been registered/i.test(error.message)
        ? "That email already has a Vanspire account, so it can't be invited to this workspace."
        : error.message,
    };
  }

  await db.insert(profiles).values({
    id: data.user.id,
    orgId: user.orgId,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    role: parsed.data.role,
  });
  await audit(user, { action: "team.invite", targetType: "profile", targetId: data.user.id, summary: `Invited ${parsed.data.fullName} as ${parsed.data.role}` });

  revalidatePath("/settings/team");
  return { error: null };
}

export async function removeTeammate(profileId: string) {
  const user = await requireUser();

  if (user.role !== "owner" || profileId === user.id) return;

  const removed = await db
    .delete(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.orgId, user.orgId)))
    .returning({ id: profiles.id, name: profiles.fullName });
  if (removed.length === 0) return;
  await audit(user, { action: "team.remove", targetType: "profile", targetId: profileId, summary: `Removed ${removed[0].name} from the workspace` });

  // Each login belongs to exactly one workspace, so removing someone also
  // deletes their login — otherwise they could still sign in (and would be
  // offered a brand-new workspace by onboarding).
  await createAdminClient().auth.admin.deleteUser(profileId);

  revalidatePath("/settings/team");
}
