"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { requestPasswordReset, type ForgotState } from "./actions";


const initialState: ForgotState = { error: null };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {state.sent ? (
        <div className="flex flex-col gap-3 text-center text-sm">
          <p className="text-muted">
            If that email has an account, a reset link is on its way. It expires in about an hour.
          </p>
          <Link href="/login" className="font-medium text-accent-deep hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@business.com" />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <Link href="/login" className="text-center text-sm text-muted hover:text-foreground">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
