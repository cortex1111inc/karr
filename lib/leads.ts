// Single source for lead-source labels/options — previously copied into
// the pipeline board, filters, forms and reports separately.
export const LEAD_SOURCES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "call", label: "Call" },
  { value: "website", label: "Website" },
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
] as const;

export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(LEAD_SOURCES.map((s) => [s.value, s.label]));

export const LEAD_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
] as const;

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(LEAD_STAGES.map((s) => [s.value, s.label]));
