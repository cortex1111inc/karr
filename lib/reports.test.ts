import { describe, expect, it } from "vitest";
import { funnel, medianDaysToBook, parseDateRange, pctDelta, receivablesAging, weekKey } from "./reports";

const d = (s: string) => new Date(`${s}T12:00:00`);

describe("funnel", () => {
  it("counts each lead at every stage up to the furthest reached", () => {
    const rows = funnel([
      { leadId: "a", toStage: "new", changedAt: d("2026-09-01") },
      { leadId: "a", toStage: "contacted", changedAt: d("2026-09-02") },
      { leadId: "a", toStage: "booked", changedAt: d("2026-09-03") },
      { leadId: "b", toStage: "new", changedAt: d("2026-09-01") },
      { leadId: "b", toStage: "lost", changedAt: d("2026-09-02") },
      { leadId: "c", toStage: "quoted", changedAt: d("2026-09-02") },
    ]);
    expect(rows.map((r) => r.count)).toEqual([3, 2, 2, 1]);
    expect(rows[3].rate).toBe(50);
  });
  it("handles no data", () => expect(funnel([]).every((r) => r.count === 0)).toBe(true));
});

describe("medianDaysToBook", () => {
  it("takes the median", () => {
    expect(medianDaysToBook([])).toBeNull();
    expect(
      medianDaysToBook([
        { createdAt: d("2026-09-01"), bookedAt: d("2026-09-02") },
        { createdAt: d("2026-09-01"), bookedAt: d("2026-09-05") },
        { createdAt: d("2026-09-01"), bookedAt: d("2026-09-11") },
      ]),
    ).toBe(4);
  });
});

describe("receivablesAging", () => {
  it("buckets outstanding balances by age and skips paid ones", () => {
    const now = d("2026-09-30");
    const b = receivablesAging(
      [
        { total: "1000", amountPaid: "400", createdAt: d("2026-09-20") },
        { total: "500", amountPaid: "0", createdAt: d("2026-08-15") },
        { total: "300", amountPaid: "0", createdAt: d("2026-06-01") },
        { total: "200", amountPaid: "200", createdAt: d("2026-06-01") },
      ],
      now,
    );
    expect(b.map((x) => x.amount)).toEqual([600, 500, 300]);
    expect(b[2].count).toBe(1);
  });
});

describe("helpers", () => {
  it("pctDelta", () => {
    expect(pctDelta(150, 100)).toBe(50);
    expect(pctDelta(5, 0)).toBeNull();
  });
  it("weekKey starts on Monday", () => {
    expect(weekKey(d("2026-09-30"))).toBe("2026-09-28");
    expect(weekKey(d("2026-09-28"))).toBe("2026-09-28");
    expect(weekKey(d("2026-09-27"))).toBe("2026-09-21");
  });
  it("parseDateRange", () => {
    expect(parseDateRange(null, null)).toEqual({ from: null, to: null });
    expect(parseDateRange("2026-09-10", "2026-09-01")).toHaveProperty("error");
    expect(parseDateRange("nope", null)).toHaveProperty("error");
  });
});
