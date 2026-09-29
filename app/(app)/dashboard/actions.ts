"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireOwner } from "@/lib/auth";

export async function dismissOnboarding() {
  const user = await requireOwner();
  await db.update(organizations).set({ onboardingDismissedAt: new Date() }).where(eq(organizations.id, user.orgId));
  revalidatePath("/dashboard");
}
