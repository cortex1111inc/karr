"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null };

export async function updateName(_prev: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const parsed = z.string().trim().min(1, "Enter your name").max(100).safeParse(formData.get("fullName"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter your name" };

  await db.update(profiles).set({ fullName: parsed.data }).where(eq(profiles.id, user.id));
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
