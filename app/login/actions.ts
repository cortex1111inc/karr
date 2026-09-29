"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/redirects";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

export async function signIn(_prevState: { error: string | null }, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  // Slows password guessing from one connection; Supabase has its own limits too.
  if (!(await consumeRateLimit(await clientKey("login"), 10, 600))) {
    return { error: "Too many sign-in attempts. Wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Email not confirmed"
          ? "Confirm your email first — check your inbox for the link we sent."
          : "That email and password don't match.",
    };
  }

  redirect(next);
}
