"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match", path: ["confirm"] });

// Used for three flows that all end with "choose a password": recovery
// links, staff invite acceptance, and a signed-in user changing theirs.
export async function setNewPassword(_prev: { error: string | null }, formData: FormData) {
  const parsed = schema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  redirect(profile ? "/dashboard" : "/onboarding");
}
