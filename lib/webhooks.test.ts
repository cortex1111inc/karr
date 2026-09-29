import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mapRazorpayMethod, verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { parseWhatsAppWebhook, phoneKey, verifyMetaSignature } from "@/lib/whatsapp/webhook";

const body = JSON.stringify({ hello: "world" });

describe("verifyMetaSignature", () => {
  const sig = "sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex");
  it("accepts a correct signature", () => expect(verifyMetaSignature(body, sig, "s3cret")).toBe(true));
  it("rejects a wrong secret, tampered body, or missing header", () => {
    expect(verifyMetaSignature(body, sig, "other")).toBe(false);
    expect(verifyMetaSignature(body + " ", sig, "s3cret")).toBe(false);
    expect(verifyMetaSignature(body, null, "s3cret")).toBe(false);
    expect(verifyMetaSignature(body, "sha256=abc", "s3cret")).toBe(false);
  });
});

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

describe("parseWhatsAppWebhook", () => {
  it("extracts messages with contact names and status updates", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "PN1" },
                contacts: [{ wa_id: "919876543210", profile: { name: "Asha" } }],
                messages: [
                  { id: "m1", from: "919876543210", type: "text", text: { body: "Need an SUV" } },
                  { id: "m2", from: "919876543210", type: "image" },
                ],
                statuses: [
                  { id: "w1", status: "delivered" },
                  { id: "w2", status: "failed", errors: [{ title: "Undeliverable" }] },
                  { id: "w3", status: "weird" },
                ],
              },
            },
          ],
        },
      ],
    };
    const { messages, statuses } = parseWhatsAppWebhook(payload);
    expect(messages).toEqual([
      { phoneNumberId: "PN1", from: "+919876543210", name: "Asha", text: "Need an SUV", id: "m1" },
      { phoneNumberId: "PN1", from: "+919876543210", name: "Asha", text: "[image]", id: "m2" },
    ]);
    expect(statuses).toEqual([
      { providerMessageId: "w1", status: "delivered", error: null },
      { providerMessageId: "w2", status: "failed", error: "Undeliverable" },
    ]);
  });

  it("tolerates junk", () => {
    expect(parseWhatsAppWebhook(null)).toEqual({ messages: [], statuses: [] });
    expect(parseWhatsAppWebhook({ entry: [{ changes: [{}] }] })).toEqual({ messages: [], statuses: [] });
  });
});

describe("phoneKey", () => {
  it("matches the same number written differently", () => {
    expect(phoneKey("+91 98765 43210")).toBe("9876543210");
    expect(phoneKey("098765-43210")).toBe("9876543210");
    expect(phoneKey("9876543210")).toBe("9876543210");
  });
});
