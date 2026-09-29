import { describe, expect, it } from "vitest";
import { calculateTotals, formatCurrency } from "./money";

describe("calculateTotals", () => {
  it("sums line items without GST", () => {
    expect(
      calculateTotals(
        [
          { description: "Rental", quantity: 3, unitPrice: 1500 },
          { description: "Driver", quantity: 1, unitPrice: 500 },
        ],
        false,
        18,
      ),
    ).toEqual({ subtotal: 5000, taxAmount: 0, total: 5000 });
  });

  it("applies GST only when enabled", () => {
    expect(calculateTotals([{ description: "x", quantity: 1, unitPrice: 1000 }], true, 18)).toEqual({
      subtotal: 1000,
      taxAmount: 180,
      total: 1180,
    });
  });

  it("rounds to 2 decimal places at each step", () => {
    const totals = calculateTotals([{ description: "x", quantity: 3, unitPrice: 0.1 }], true, 18);
    expect(totals.subtotal).toBe(0.3);
    expect(totals.taxAmount).toBe(0.05);
    expect(totals.total).toBe(0.35);
  });

  it("doesn't drift across many small lines", () => {
    const items = Array.from({ length: 100 }, () => ({ description: "x", quantity: 1, unitPrice: 0.1 }));
    expect(calculateTotals(items, false, 0).subtotal).toBe(10);
  });

  it("handles an empty list", () => {
    expect(calculateTotals([], true, 18)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
  });
});

describe("formatCurrency", () => {
  it("formats INR with Indian digit grouping", () => {
    expect(formatCurrency(118000)).toContain("1,18,000");
    expect(formatCurrency("1180.5")).toContain("1,180.5");
  });
});
