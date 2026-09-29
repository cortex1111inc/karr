import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, profiles } from "@/db/schema";
import { uniqueSlug } from "@/lib/slug";

// Creates a business (organization) and its owner profile in one
// transaction. Idempotent per user: if they already have a profile,
// nothing is created — so a double-submitted onboarding form or a replayed
// confirmation link can't create a second workspace.
export async function createWorkspace(input: {
  userId: string;
  email: string;
  fullName: string;
  businessName: string;
}): Promise<{ orgId: string; created: boolean }> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ orgId: profiles.orgId })
      .from(profiles)
      .where(eq(profiles.id, input.userId))
      .limit(1);
    if (existing) return { orgId: existing.orgId, created: false };

    const [org] = await tx
      .insert(organizations)
      .values({ name: input.businessName, slug: uniqueSlug(input.businessName) })
      .returning({ id: organizations.id });

    await tx.insert(profiles).values({
      id: input.userId,
      orgId: org.id,
      fullName: input.fullName,
      email: input.email,
      role: "owner",
    });

    return { orgId: org.id, created: true };
  });
}
