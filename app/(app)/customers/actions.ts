"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const updateCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
  vehicleNumber: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
});

export async function updateCustomer(
  customerId: string,
  _prevState: { error: string | null },
  formData: FormData,
) {
  const user = await requireUser();

  const parsed = updateCustomerSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    vehicleNumber: formData.get("vehicleNumber"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db
    .update(customers)
    .set(parsed.data)
    .where(and(eq(customers.id, customerId), eq(customers.orgId, user.orgId)));

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { error: null };
}

export async function deleteCustomer(customerId: string) {
  const user = await requireUser();

  await db.delete(customers).where(and(eq(customers.id, customerId), eq(customers.orgId, user.orgId)));

  revalidatePath("/customers");
  redirect("/customers");
}
