"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createWorkspace } from "@/lib/workspace";

const schema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(100),
  businessName: z.string().trim().min(1, "Enter your business name").max(100),
});

export async function completeOnboarding(_prev: { error: string | null }, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const parsed = schema.safeParse({ fullName: formData.get("fullName"), businessName: formData.get("businessName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  await createWorkspace({ userId: user.id, email: user.email, ...parsed.data });
  redirect("/dashboard");
}
