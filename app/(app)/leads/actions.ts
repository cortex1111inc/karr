"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { leadActivities, leadSourceEnum, leadStageEnum, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const createLeadSchema = z.object({
  contactName: z.string().trim().min(1, "Name is required"),
  contactPhone: z.string().trim().min(1, "Phone is required"),
  interest: z.string().trim().min(1, "Say what they're enquiring about"),
  source: z.enum(leadSourceEnum.enumValues),
});

export async function createLead(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = createLeadSchema.safeParse({
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    interest: formData.get("interest"),
    source: formData.get("source"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db.insert(leads).values({
    orgId: user.orgId,
    assignedTo: user.id,
    ...parsed.data,
  });

  revalidatePath("/leads");
  return { error: null };
}

export async function updateLeadStage(
  leadId: string,
  stage: (typeof leadStageEnum.enumValues)[number],
) {
  const user = await requireUser();

  const [updated] = await db
    .update(leads)
    .set({ stage, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)))
    .returning({ id: leads.id });

  if (!updated) return;

  await db.insert(leadActivities).values({
    leadId,
    authorId: user.id,
    kind: "stage_change",
    body: `Moved to ${stage.replace("_", " ")}`,
  });

  revalidatePath("/leads");
}
