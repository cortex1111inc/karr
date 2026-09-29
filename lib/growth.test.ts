import { describe, expect, it } from "vitest";
import { commissionOwed, generateLinkCode, isValidLinkCode } from "./growth";

describe("generateLinkCode", () => {
  it("builds a readable, URL-safe code", () => {
    const code = generateLinkCode("Rahul K (Instagram)");
    expect(code).toMatch(/^rahul-k-instagram-[0-9a-f]{4}$/);
    expect(isValidLinkCode(code)).toBe(true);
  });

  it("falls back when the seed has no usable characters", () => {
    expect(generateLinkCode("!!!")).toMatch(/^link-[0-9a-f]{4}$/);
  });

  it("caps the readable part so codes stay short", () => {
    expect(generateLinkCode("a".repeat(80)).length).toBeLessThanOrEqual(25);
  });
});

describe("isValidLinkCode", () => {
  it.each(["abc", "rahul-1a2b", "a1"])("accepts %s", (c) => expect(isValidLinkCode(c)).toBe(true));
  it.each(["", "-abc", "abc-", "ABC", "a b", "a/b", "a".repeat(41)])("rejects %s", (c) => expect(isValidLinkCode(c)).toBe(false));
});

describe("commissionOwed", () => {
  it("pays a flat amount per booked lead", () => {
    expect(commissionOwed("flat", 250, 4, 99999)).toBe(1000);
  });
  it("pays a percentage of revenue", () => {
    expect(commissionOwed("percent", 10, 99, 12345)).toBe(1234.5);
  });
  it("pays nothing without a commission or value", () => {
    expect(commissionOwed("none", 10, 5, 1000)).toBe(0);
    expect(commissionOwed("flat", null, 5, 1000)).toBe(0);
    expect(commissionOwed("percent", 0, 5, 1000)).toBe(0);
  });
});
