import { describe, expect, it } from "vitest";
import { parseLineItems } from "./schema";

describe("parseLineItems", () => {
  it("parses a valid JSON array", () => {
    const result = parseLineItems(JSON.stringify([{ description: "Oil change", quantity: "2", unitPrice: "450" }]));
    expect(result).toEqual({
      success: true,
      data: [{ description: "Oil change", quantity: 2, unitPrice: 450, hsnSac: null, stockItemId: null }],
    });
  });

  it.each([
    ["missing value", null, "No line items submitted"],
    ["malformed JSON", "{not json", "Malformed line items"],
    ["empty array", "[]", "Add at least one line item"],
  ])("rejects %s", (_label, raw, message) => {
    expect(parseLineItems(raw)).toEqual({ success: false, error: message });
  });

  it("rejects a blank description", () => {
    const result = parseLineItems(JSON.stringify([{ description: "  ", quantity: 1, unitPrice: 10 }]));
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const result = parseLineItems(JSON.stringify([{ description: "x", quantity: 1, unitPrice: -5 }]));
    expect(result).toEqual({ success: false, error: "Unit price can't be negative" });
  });

  it("rejects a zero quantity", () => {
    const result = parseLineItems(JSON.stringify([{ description: "x", quantity: 0, unitPrice: 5 }]));
    expect(result).toEqual({ success: false, error: "Quantity must be positive" });
  });
});
