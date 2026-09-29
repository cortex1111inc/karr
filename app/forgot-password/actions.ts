"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

export type ForgotState = { error: string | null; sent?: boolean };

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email." };

  if (!(await consumeRateLimit(await clientKey("password-reset"), 5, 3600))) {
    return { error: "Too many reset requests. Try again later." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  // Same response whether or not the email is registered — don't let this
  // form be used to check who has an account.
  return { error: null, sent: true };
}
