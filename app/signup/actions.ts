"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { createWorkspace } from "@/lib/workspace";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(100),
  businessName: z.string().trim().min(1, "Enter your business name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters for your password").max(72),
});

export type SignupState = { error: string | null; checkEmail?: string };

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Confirmation link → callback → /onboarding, which creates the
      // workspace from the metadata below (prefilled, one click).
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
      data: { full_name: fullName, business_name: businessName },
    },
  });

  if (error) return { error: error.message };

  // Supabase hides whether an email is registered: for an existing account
  // it returns a user with no identities instead of an error.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Sign in instead." };
  }

  // Email confirmation turned off in Supabase → we already have a session.
  if (data.session && data.user) {
    await createWorkspace({ userId: data.user.id, email, fullName, businessName });
    redirect("/dashboard");
  }

  return { error: null, checkEmail: email };
}
