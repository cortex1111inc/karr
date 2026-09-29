"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { notificationKindEnum, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null };

export async function updateName(_prev: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const parsed = z
    .object({
      fullName: z.string().trim().min(1, "Enter your name").max(100),
      phone: z
        .string()
        .trim()
        .max(20)
        .regex(/^$|^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
    })
    .safeParse({ fullName: formData.get("fullName"), phone: formData.get("phone") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  await db
    .update(profiles)
    .set({ fullName: parsed.data.fullName, phone: parsed.data.phone || null })
    .where(eq(profiles.id, user.id));
  revalidatePath("/", "layout");
  return { error: null };
}

const passwordSchema = z
  .object({ password: z.string().min(8, "Use at least 8 characters").max(72), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match" });

export async function changePassword(_prev: State, formData: FormData): Promise<State> {
  await requireUser();
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  return { error: error ? error.message : null };
}

// Revokes every session for this login (other phones/browsers included).
export async function signOutEverywhere() {
  await requireUser();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

// The form posts the kinds the user wants ON; everything else is muted.
export async function updateNotificationPrefs(_prev: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const enabled = new Set(formData.getAll("kind").map(String));
  const muted = notificationKindEnum.enumValues.filter((k) => k !== "system" && !enabled.has(k));
  await db.update(profiles).set({ mutedNotificationKinds: muted }).where(eq(profiles.id, user.id));
  revalidatePath("/settings/account");
  return { error: null };
}
