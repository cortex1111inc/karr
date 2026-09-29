import type { Metadata } from "next";
import { AuthCard } from "@/components/layout/auth-card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your workspace — Vanspire OS" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your workspace" subtitle="Leads, customers, billing and reminders — in one place.">
      <SignupForm />
    </AuthCard>
  );
}
