import { describe, expect, it } from "vitest";
import { siteSchema } from "./growth-site-schema";

const base = { published: true, accent: "green", services: [] };

describe("siteSchema", () => {
  it("accepts https links", () => {
    const r = siteSchema.safeParse({ ...base, mapUrl: "https://maps.app.goo.gl/abc", heroImageUrl: "https://cdn.example.com/a.jpg" });
    expect(r.success).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "http://insecure.example", "not a url", "JAVASCRIPT:alert(1)"])(
    "rejects unsafe link %s",
    (url) => {
      expect(siteSchema.safeParse({ ...base, mapUrl: url }).success).toBe(false);
      expect(siteSchema.safeParse({ ...base, heroImageUrl: url }).success).toBe(false);
    },
  );

  it("treats blank links as empty", () => {
    const r = siteSchema.safeParse({ ...base, mapUrl: "  " });
    expect(r.success && r.data.mapUrl).toBe(null);
  });

  it("validates WhatsApp numbers and caps services", () => {
    expect(siteSchema.safeParse({ ...base, whatsappNumber: "+91 90000 00000" }).success).toBe(true);
    expect(siteSchema.safeParse({ ...base, whatsappNumber: "call me" }).success).toBe(false);
    expect(siteSchema.safeParse({ ...base, services: Array.from({ length: 21 }, () => ({ name: "x" })) }).success).toBe(false);
    expect(siteSchema.safeParse({ ...base, services: [{ name: "" }] }).success).toBe(false);
  });
});
