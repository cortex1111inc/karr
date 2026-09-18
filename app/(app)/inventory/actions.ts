"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { stockItems, stockMovementTypeEnum, stockMovements } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const stockItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  unit: z.string().trim().min(1, "Unit is required").default("pcs"),
  quantityOnHand: z.coerce.number().int().min(0, "Can't be negative"),
  lowStockThreshold: z.coerce.number().int().min(0, "Can't be negative"),
  costPrice: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function createStockItem(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = stockItemSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    unit: formData.get("unit") || "pcs",
    quantityOnHand: formData.get("quantityOnHand") || 0,
    lowStockThreshold: formData.get("lowStockThreshold") || 5,
    costPrice: formData.get("costPrice"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db.insert(stockItems).values({ orgId: user.orgId, ...parsed.data });

  revalidatePath("/inventory");
  return { error: null };
}

const editStockItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  unit: z.string().trim().min(1, "Unit is required"),
  lowStockThreshold: z.coerce.number().int().min(0, "Can't be negative"),
  costPrice: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function updateStockItem(stockItemId: string, _prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = editStockItemSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    unit: formData.get("unit"),
    lowStockThreshold: formData.get("lowStockThreshold"),
    costPrice: formData.get("costPrice"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db
    .update(stockItems)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(stockItems.id, stockItemId), eq(stockItems.orgId, user.orgId)));

  revalidatePath(`/inventory/${stockItemId}`);
  revalidatePath("/inventory");
  return { error: null };
}

export async function deleteStockItem(stockItemId: string) {
  const user = await requireUser();

  await db.delete(stockItems).where(and(eq(stockItems.id, stockItemId), eq(stockItems.orgId, user.orgId)));

  revalidatePath("/inventory");
}

const movementSchema = z.object({
  type: z.enum(stockMovementTypeEnum.enumValues),
  // Restock/usage always take a positive count (sign applied below based on
  // type); adjustment allows a negative number directly, for a correction.
  quantity: z.coerce.number().int().refine((v) => v !== 0, "Enter a non-zero quantity"),
  note: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function recordStockMovement(
  stockItemId: string,
  _prevState: { error: string | null },
  formData: FormData,
) {
  const user = await requireUser();

  const parsed = movementSchema.safeParse({
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [item] = await db
    .select({ quantityOnHand: stockItems.quantityOnHand })
    .from(stockItems)
    .where(and(eq(stockItems.id, stockItemId), eq(stockItems.orgId, user.orgId)))
    .limit(1);

  if (!item) {
    return { error: "Item not found." };
  }

  // restock adds, usage subtracts, adjustment can go either way — the form
  // collects a signed "adjustment" quantity directly for that case.
  const signedQuantity =
    parsed.data.type === "usage"
      ? -Math.abs(parsed.data.quantity)
      : parsed.data.type === "restock"
        ? Math.abs(parsed.data.quantity)
        : parsed.data.quantity;

  const nextQuantity = item.quantityOnHand + signedQuantity;
  if (nextQuantity < 0) {
    return { error: `Not enough stock — only ${item.quantityOnHand} on hand.` };
  }

  await db.insert(stockMovements).values({
    orgId: user.orgId,
    stockItemId,
    type: parsed.data.type,
    quantity: signedQuantity,
    note: parsed.data.note,
    createdBy: user.id,
  });

  await db
    .update(stockItems)
    .set({ quantityOnHand: nextQuantity, updatedAt: new Date() })
    .where(eq(stockItems.id, stockItemId));

  revalidatePath(`/inventory/${stockItemId}`);
  revalidatePath("/inventory");
  return { error: null };
}
