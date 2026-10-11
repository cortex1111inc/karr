import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FLOW } from "@/lib/guide-content";
import { Preview } from "@/app/(app)/guide/flow-simulator";

const base = { interState: false, accepted: false, clash: false, invoiced: false, paid: false };
const all = { interState: true, accepted: true, clash: true, invoiced: true, paid: true };

describe("flow previews", () => {
  it("renders every step in both its before and after state", () => {
    FLOW.forEach((_, i) => {
      for (const flags of [base, all]) {
        const html = renderToString(<Preview index={i} flags={flags} set={() => {}} />);
        expect(html.length).toBeGreaterThan(200);
        expect(html).not.toContain("NaN");
        expect(html).not.toContain("undefined");
      }
    });
  });

  it("shows the right tax split and totals", () => {
    const same = renderToString(<Preview index={2} flags={base} set={() => {}} />);
    expect(same).toContain("CGST");
    expect(same).toContain("SGST");
    expect(same).toContain("12,980.00");
    const inter = renderToString(<Preview index={2} flags={{ ...base, interState: true }} set={() => {}} />);
    expect(inter).toContain("IGST");
    expect(inter).not.toContain("CGST");
  });

  it("moves stock and invoice status with the interactions", () => {
    expect(renderToString(<Preview index={5} flags={base} set={() => {}} />)).toContain(">20<");
    expect(renderToString(<Preview index={5} flags={{ ...base, invoiced: true }} set={() => {}} />)).toContain(">19<");
    expect(renderToString(<Preview index={6} flags={base} set={() => {}} />)).toContain("partial");
    expect(renderToString(<Preview index={6} flags={{ ...base, paid: true }} set={() => {}} />)).toContain("paid");
  });
});
