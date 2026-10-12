"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWorkspace } from "@/lib/workspace";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(100),
  businessName: z.string().trim().min(1, "Enter your business name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters for your password").max(72),
});

export type SignupState = { error: string | null };

export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  if (!(await consumeRateLimit(await clientKey("signup"), 5, 3600))) {
    return { error: "Too many sign-up attempts from this connection. Try again later." };
  }

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { fullName, businessName, email, password } = parsed.data;

  // Create the login already confirmed (no email is sent), then sign in at
  // once so the new owner lands in their workspace. Trade-off: the address
  // isn't verified at signup; password reset still proves ownership later.
  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, business_name: businessName },
  });

  if (createError || !created.user) {
    if (createError && /already|registered|exists/i.test(createError.message)) {
      return { error: "An account with this email already exists. Sign in instead." };
    }
    return { error: "We couldn't create your account. Please try again." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // Account exists but the session didn't start; signing in manually works.
    redirect("/login");
  }

  // If this fails the user is signed in without a workspace, and /onboarding
  // (reached via requireUser) finishes the job with the same details.
  await createWorkspace({ userId: created.user.id, email, fullName, businessName });
  redirect("/app/dashboard");
}
