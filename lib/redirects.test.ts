import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirects";

describe("safeNextPath", () => {
  it.each(["/app/dashboard", "/app/leads/123", "/reset-password?welcome=1"])("allows same-site path %s", (p) => {
    expect(safeNextPath(p)).toBe(p);
  });

  it.each([
    ["absolute URL", "https://evil.example"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["relative path", "dashboard"],
    ["header injection", "/ok\r\nSet-Cookie: x=1"],
    ["empty", ""],
    ["non-string", null],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/app/dashboard");
  });

  it("uses a custom fallback", () => {
    expect(safeNextPath("https://x", "/onboarding")).toBe("/onboarding");
  });
});
