import { describe, expect, it } from "vitest";
import { ALL_SETUP_KEYS, FEATURES, FEATURE_GROUPS, FLOW, SETUP, setupProgress, type SetupKey } from "./guide-content";

describe("guide content", () => {
  it("has unique ids and internal links", () => {
    for (const list of [FLOW, FEATURES]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const x of list) expect(x.href.startsWith("/")).toBe(true);
    }
    for (const item of SETUP.flatMap((p) => p.items)) expect(item.href.startsWith("/")).toBe(true);
  });

  it("puts every feature in a known group and every group has features", () => {
    for (const f of FEATURES) expect(FEATURE_GROUPS).toContain(f.group);
    for (const g of FEATURE_GROUPS) expect(FEATURES.some((f) => f.group === g)).toBe(true);
  });

  it("has no duplicate setup keys", () => {
    expect(new Set(ALL_SETUP_KEYS).size).toBe(ALL_SETUP_KEYS.length);
  });
});

describe("setupProgress", () => {
  const none = Object.fromEntries(ALL_SETUP_KEYS.map((k) => [k, false])) as Record<SetupKey, boolean>;

  it("starts at zero and reaches 100 when every required item is done", () => {
    expect(setupProgress(none).percent).toBe(0);
    const required = SETUP.flatMap((p) => p.items).filter((i) => !i.optional);
    const done = { ...none };
    for (const i of required) done[i.key] = true;
    const p = setupProgress(done);
    expect(p.percent).toBe(100);
    expect(p.optionalDone).toBe(0);
  });

  it("ignores optional items for the percentage but counts them separately", () => {
    const done = { ...none, team: true, vehicles: true };
    const p = setupProgress(done);
    expect(p.percent).toBe(0);
    expect(p.optionalDone).toBe(2);
  });
});
