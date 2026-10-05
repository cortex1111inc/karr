import { describe, expect, it } from "vitest";
import { csvResponse, toCsv } from "./csv";

type Row = { name: string | null; note: string; when: Date | null; amount: number };

const columns = [
  { key: "name" as const, label: "Name" },
  { key: "note" as const, label: "Note" },
  { key: "when" as const, label: "When" },
  { key: "amount" as const, label: "Amount" },
];

describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    const csv = toCsv<Row>([{ name: "A", note: "b", when: null, amount: 1 }], columns);
    expect(csv).toBe("Name,Note,When,Amount\r\nA,b,,1");
  });

  it("quotes cells containing commas, quotes, or newlines", () => {
    const csv = toCsv<Row>([{ name: 'Say "hi"', note: "a,b\nc", when: null, amount: 0 }], columns);
    expect(csv.split("\r\n")[1]).toBe('"Say ""hi""","a,b\nc",,0');
  });

  it("serializes dates as ISO strings and nulls as empty", () => {
    const when = new Date("2026-09-01T10:00:00.000Z");
    const csv = toCsv<Row>([{ name: null, note: "", when, amount: 2 }], columns);
    expect(csv.split("\r\n")[1]).toBe(",,2026-09-01T10:00:00.000Z,2");
  });

  it("neutralises formula-looking text but not negative numbers", () => {
    const csv = toCsv<Row>([{ name: "=HYPERLINK(\"x\")", note: "-100.00", when: null, amount: -5 }], columns);
    expect(csv.split("\r\n")[1]).toBe('"\'=HYPERLINK(""x"")",-100.00,,-5');
    expect(toCsv<Row>([{ name: "@SUM(A1)", note: "+91 98", when: null, amount: 0 }], columns).split("\r\n")[1]).toBe(
      "'@SUM(A1),'+91 98,,0",
    );
  });
});

describe("csvResponse", () => {
  it("sets a CSV content type and attachment filename", () => {
    const res = csvResponse("leads.csv", "a,b");
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="leads.csv"');
  });
});
