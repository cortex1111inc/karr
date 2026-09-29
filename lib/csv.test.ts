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
});

describe("csvResponse", () => {
  it("sets a CSV content type and attachment filename", () => {
    const res = csvResponse("leads.csv", "a,b");
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="leads.csv"');
  });
});
