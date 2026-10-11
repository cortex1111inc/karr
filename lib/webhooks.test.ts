import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mapRazorpayMethod, verifyRazorpaySignature } from "@/lib/payments/razorpay";

const body = JSON.stringify({ hello: "world" });

describe("verifyRazorpaySignature", () => {
  const sig = createHmac("sha256", "whsec").update(body).digest("hex");
  it("accepts a correct signature", () => expect(verifyRazorpaySignature(body, sig, "whsec")).toBe(true));
  it("rejects anything else", () => {
    expect(verifyRazorpaySignature(body, sig, "nope")).toBe(false);
    expect(verifyRazorpaySignature(body, null, "whsec")).toBe(false);
  });
});

describe("mapRazorpayMethod", () => {
  it("maps gateway methods onto ours", () => {
    expect(mapRazorpayMethod("upi")).toBe("upi");
    expect(mapRazorpayMethod("card")).toBe("card");
    expect(mapRazorpayMethod("netbanking")).toBe("bank_transfer");
    expect(mapRazorpayMethod("wallet")).toBe("other");
    expect(mapRazorpayMethod(undefined)).toBe("other");
  });
});
