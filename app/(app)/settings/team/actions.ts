"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email);

  if (error) {
    return { error: error.message };
  }

  await db.insert(profiles).values({
    id: data.user.id,
    orgId: user.orgId,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  revalidatePath("/settings/team");
  return { error: null };
}

export async function removeTeammate(profileId: string) {
  const user = await requireUser();

  if (user.role !== "owner" || profileId === user.id) return;

  await db.delete(profiles).where(and(eq(profiles.id, profileId), eq(profiles.orgId, user.orgId)));

  revalidatePath("/settings/team");
}
