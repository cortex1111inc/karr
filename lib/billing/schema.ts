import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description required").max(500),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price can't be negative"),
  hsnSac: z
    .string()
    .trim()
    .regex(/^$|^[0-9]{4,8}$/, "HSN/SAC codes are 4–8 digits")
    .optional()
    .transform((v) => v || null),
  stockItemId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export const lineItemsSchema = z
  .array(lineItemSchema)
  .min(1, "Add at least one line item")
  .max(100, "At most 100 line items")
  .refine((items) => items.every((i) => !i.stockItemId || Number.isInteger(i.quantity)), {
    message: "Quantities for stock items must be whole numbers",
  });

export type ParsedLineItem = z.infer<typeof lineItemSchema>;

export function parseLineItems(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") {
    return { success: false as const, error: "No line items submitted" };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { success: false as const, error: "Malformed line items" };
  }
  const parsed = lineItemsSchema.safeParse(json);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Check the line items" };
  }
  return { success: true as const, data: parsed.data };
}
