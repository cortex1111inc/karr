"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { completeOnboarding } from "./actions";

const initialState: { error: string | null } = { error: null };

export function OnboardingForm({ fullName, businessName }: { fullName: string; businessName: string }) {
  const [state, formAction, pending] = useActionState(completeOnboarding, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" required defaultValue={businessName} autoComplete="organization" />
      </div>
      <div>
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" required defaultValue={fullName} autoComplete="name" />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="accent" disabled={pending} className="mt-1">
        {pending ? "Setting up…" : "Open my workspace"}
      </Button>
    </form>
  );
}
