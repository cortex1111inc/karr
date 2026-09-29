import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);

afterEach(() => {
  delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = KEY_A;
    const stored = encryptSecret("EAA-token-123");
    expect(stored).not.toContain("EAA-token-123");
    expect(decryptSecret(stored)).toBe("EAA-token-123");
  });

  it("uses a fresh IV every time", () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = KEY_A;
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("fails to decrypt with a different key", () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = KEY_A;
    const stored = encryptSecret("secret");
    process.env.INTEGRATIONS_ENCRYPTION_KEY = KEY_B;
    expect(() => decryptSecret(stored)).toThrow();
  });

  it("detects tampering", () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = KEY_A;
    const [iv, tag, ct] = encryptSecret("secret").split(":");
    const flipped = (parseInt(ct.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, "0") + ct.slice(2);
    expect(() => decryptSecret([iv, tag, flipped].join(":"))).toThrow();
  });

  it("rejects malformed input", () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = KEY_A;
    expect(() => decryptSecret("not-encrypted")).toThrow("Malformed encrypted value.");
  });

  it("throws a clear error when the key is missing", () => {
    expect(() => encryptSecret("x")).toThrow("INTEGRATIONS_ENCRYPTION_KEY is not set");
  });
});
