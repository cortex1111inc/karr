import { describe, expect, it } from "vitest";
import { scrub } from "./log";

describe("scrub", () => {
  it("masks emails and phone numbers", () => {
    expect(scrub("failed for asha@example.com")).toBe("failed for [email]");
    expect(scrub("to +91 98765 43210 failed")).toBe("to [phone] failed");
    expect(scrub("call (080) 2345-6789 now")).toBe("call [phone] now");
  });
  it("leaves ordinary text and short numbers alone", () => {
    expect(scrub("invoice INV-0042 total 1500")).toBe("invoice INV-0042 total 1500");
  });
});
