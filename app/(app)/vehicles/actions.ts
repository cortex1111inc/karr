"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { vehicleStatusEnum, vehicles } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const vehicleSchema = z.object({
  registrationNumber: z.string().trim().min(1, "Registration number is required"),
  make: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  model: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  category: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  dailyRate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function createVehicle(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = vehicleSchema.safeParse({
    registrationNumber: formData.get("registrationNumber"),
    make: formData.get("make"),
    model: formData.get("model"),
    category: formData.get("category"),
    dailyRate: formData.get("dailyRate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    await db.insert(vehicles).values({ orgId: user.orgId, ...parsed.data });
  } catch {
    return { error: "That registration number is already in your fleet." };
  }

  revalidatePath("/vehicles");
  return { error: null };
}

export async function updateVehicle(vehicleId: string, _prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = vehicleSchema.safeParse({
    registrationNumber: formData.get("registrationNumber"),
    make: formData.get("make"),
    model: formData.get("model"),
    category: formData.get("category"),
    dailyRate: formData.get("dailyRate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db
    .update(vehicles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.orgId, user.orgId)));

  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath("/vehicles");
  return { error: null };
}

export async function updateVehicleStatus(vehicleId: string, status: (typeof vehicleStatusEnum.enumValues)[number]) {
  const user = await requireUser();

  await db
    .update(vehicles)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.orgId, user.orgId)));

  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath("/vehicles");
}

export async function deleteVehicle(vehicleId: string) {
  const user = await requireUser();

  await db.delete(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.orgId, user.orgId)));

  revalidatePath("/vehicles");
}
