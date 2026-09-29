// GST helpers. Tax is still computed once by calculateTotals(); this only
// decides how that tax is presented (CGST+SGST within a state, IGST across
// states) and validates the identifiers.

export const GST_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

const STATE_CODES = new Set(GST_STATES.map((s) => s.code));

export function stateName(code: string | null | undefined): string | null {
  return GST_STATES.find((s) => s.code === code)?.name ?? null;
}

export function isStateCode(code: string): boolean {
  return STATE_CODES.has(code);
}

// 2-digit state + 10-char PAN + entity digit + "Z" + checksum char.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_RE.test(gstin) && STATE_CODES.has(gstin.slice(0, 2));
}

// Inter-state only when both ends are known and differ; unknown defaults to
// intra-state (CGST+SGST), the common case for a local business.
export function isInterState(orgStateCode: string | null | undefined, placeOfSupply: string | null | undefined): boolean {
  return Boolean(orgStateCode && placeOfSupply && orgStateCode !== placeOfSupply);
}

export type TaxSplit = { cgst: number; sgst: number; igst: number };

export function splitTax(taxAmount: number, interState: boolean): TaxSplit {
  if (interState) return { cgst: 0, sgst: 0, igst: taxAmount };
  const cgst = Math.round((taxAmount / 2) * 100) / 100;
  return { cgst, sgst: Math.round((taxAmount - cgst) * 100) / 100, igst: 0 };
}
