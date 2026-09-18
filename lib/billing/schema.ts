import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price can't be negative"),
});

export const lineItemsSchema = z.array(lineItemSchema).min(1, "Add at least one line item");

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
