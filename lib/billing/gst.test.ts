import { describe, expect, it } from "vitest";
import { isInterState, isValidGstin, splitTax, stateName } from "./gst";
import { lineItemsSchema } from "./schema";
import { parseRentalRange, rentalDays } from "@/lib/rental-dates";

describe("GSTIN validation", () => {
  it("accepts well-formed GSTINs with a real state code", () => {
    expect(isValidGstin("32ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
  });
  it("rejects bad shapes and unknown states", () => {
    expect(isValidGstin("32ABCDE1234F1Y5")).toBe(false); // 14th char must be Z
    expect(isValidGstin("99ABCDE1234F1Z5")).toBe(false);
    expect(isValidGstin("32abcde1234f1z5")).toBe(false);
    expect(isValidGstin("32ABCDE1234F1Z")).toBe(false);
  });
  it("names states", () => expect(stateName("32")).toBe("Kerala"));
});

describe("tax split", () => {
  it("is intra-state unless both states are known and differ", () => {
    expect(isInterState("32", "33")).toBe(true);
    expect(isInterState("32", "32")).toBe(false);
    expect(isInterState(null, "33")).toBe(false);
    expect(isInterState("32", null)).toBe(false);
  });
  it("splits CGST/SGST so the halves always add back to the total", () => {
    expect(splitTax(180, false)).toEqual({ cgst: 90, sgst: 90, igst: 0 });
    const odd = splitTax(10.01, false);
    expect(odd.cgst + odd.sgst).toBeCloseTo(10.01, 10);
    expect(splitTax(180, true)).toEqual({ cgst: 0, sgst: 0, igst: 180 });
  });
});

describe("line items", () => {
  const base = { description: "Oil filter", unitPrice: 250 };
  it("requires whole quantities for stock-linked lines", () => {
    const stockItemId = "5b68788c-2a81-47a4-ba4f-65034950f736";
    expect(lineItemsSchema.safeParse([{ ...base, quantity: 1.5, stockItemId }]).success).toBe(false);
    expect(lineItemsSchema.safeParse([{ ...base, quantity: 2, stockItemId }]).success).toBe(true);
    expect(lineItemsSchema.safeParse([{ ...base, quantity: 1.5 }]).success).toBe(true);
  });
  it("validates HSN/SAC codes", () => {
    expect(lineItemsSchema.safeParse([{ ...base, quantity: 1, hsnSac: "9966" }]).success).toBe(true);
    expect(lineItemsSchema.safeParse([{ ...base, quantity: 1, hsnSac: "99" }]).success).toBe(false);
  });
});

describe("rental ranges", () => {
  it("counts inclusive days", () => {
    expect(rentalDays("2026-10-01", "2026-10-01")).toBe(1);
    expect(rentalDays("2026-10-01", "2026-10-03")).toBe(3);
  });
  it("parses optional date pairs", () => {
    expect(parseRentalRange("", "")).toEqual({ rentalStart: null, rentalEnd: null });
    expect(parseRentalRange("2026-10-01", "2026-10-03")).toEqual({ rentalStart: "2026-10-01", rentalEnd: "2026-10-03" });
    expect(parseRentalRange("2026-10-03", "2026-10-01")).toHaveProperty("error");
    expect(parseRentalRange("2026-10-03", "")).toHaveProperty("error");
  });
});
