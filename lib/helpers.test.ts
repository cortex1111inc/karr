import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";
import { generatePublicToken } from "./tokens";

describe("slugify", () => {
  it.each([
    ["Acme Org", "acme-org"],
    ["  Kochi Car Spa!! ", "kochi-car-spa"],
    ["A & B -- Rentals", "a-b-rentals"],
    ["!!!", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("uniqueSlug", () => {
  it("appends a random suffix and falls back to 'org' for empty input", () => {
    expect(uniqueSlug("Acme Org")).toMatch(/^acme-org-[a-z0-9]{1,6}$/);
    expect(uniqueSlug("!!!")).toMatch(/^org-[a-z0-9]{1,6}$/);
  });
});

describe("generatePublicToken", () => {
  it("returns 32 hex chars and doesn't repeat", () => {
    const tokens = new Set(Array.from({ length: 1000 }, generatePublicToken));
    expect(tokens.size).toBe(1000);
    for (const t of tokens) expect(t).toMatch(/^[0-9a-f]{32}$/);
  });
});
