import "server-only";

export type CsvColumn<T> = { key: keyof T; label: string };

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = value instanceof Date ? value.toISOString() : String(value);
  // Customer-typed text (names, enquiries from the public booking form)
  // starting with = + - @ would run as a formula in Excel/Sheets.
  // Plain numbers (numeric columns arrive as strings, e.g. "-100.00") are safe.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) str = `'${str}`;
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
