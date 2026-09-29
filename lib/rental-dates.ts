// Pure rental-date helpers (no DB), shared by forms, pricing and tests.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validates an optional inclusive YYYY-MM-DD range from a form.
export function parseRentalRange(
  startRaw: FormDataEntryValue | null,
  endRaw: FormDataEntryValue | null,
): { rentalStart: string | null; rentalEnd: string | null } | { error: string } {
  const start = String(startRaw ?? "").trim() || null;
  const end = String(endRaw ?? "").trim() || null;
  if (!start && !end) return { rentalStart: null, rentalEnd: null };
  if (!start || !end) return { error: "Enter both the rental start and end dates." };
  if (!DATE_RE.test(start) || !DATE_RE.test(end) || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    return { error: "Rental dates look wrong." };
  }
  if (end < start) return { error: "The rental can't end before it starts." };
  return { rentalStart: start, rentalEnd: end };
}

// Inclusive day count between two YYYY-MM-DD dates.
export function rentalDays(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}
