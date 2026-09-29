"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signUp, type SignupState } from "./actions";

const initialState: SignupState = { error: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.checkEmail) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <h2 className="font-display text-base font-bold">Check your email</h2>
        <p className="text-sm text-muted">
          We sent a confirmation link to <span className="font-medium text-foreground">{state.checkEmail}</span>. Open it
          on this device to finish setting up your workspace.
        </p>
        <p className="mt-2 text-xs text-faint">Didn&apos;t get it? Check spam, or wait a minute and sign up again.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" required autoComplete="organization" placeholder="Kochi Car Spa" />
      </div>
      <div>
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@business.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="mt-1 text-xs text-faint">At least 8 characters.</p>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="accent" disabled={pending} className="mt-1">
        {pending ? "Creating your workspace…" : "Create workspace"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-deep hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
