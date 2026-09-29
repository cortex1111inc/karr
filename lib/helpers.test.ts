import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";
import { generatePublicToken } from "./tokens";
import { DEFAULT_REMINDER_MESSAGE, renderReminderMessage } from "./whatsapp/templates";

describe("slugify", () => {
  it.each([
    ["Vanspire Org", "vanspire-org"],
    ["  Kochi Car Spa!! ", "kochi-car-spa"],
    ["A & B -- Rentals", "a-b-rentals"],
    ["!!!", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("uniqueSlug", () => {
  it("appends a random suffix and falls back to 'org' for empty input", () => {
    expect(uniqueSlug("Vanspire Org")).toMatch(/^vanspire-org-[a-z0-9]{1,6}$/);
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

describe("renderReminderMessage", () => {
  it("uses the org template and replaces every {{name}}", () => {
    expect(renderReminderMessage("Hi {{name}}, {{name}}!", "Ravi")).toBe("Hi Ravi, Ravi!");
  });

  it("falls back to the default message", () => {
    expect(renderReminderMessage(null, "Ravi")).toBe(DEFAULT_REMINDER_MESSAGE.replaceAll("{{name}}", "Ravi"));
  });
});
