// Accent presets for org micro-sites. Kept to a few tested combinations
// (readable text on the button color) rather than a free color picker.
export const SITE_ACCENTS = {
  green: { label: "Green", bg: "#78bb45", text: "#14240a", soft: "#eef5e3" },
  blue: { label: "Blue", bg: "#2563a8", text: "#ffffff", soft: "#e6eef8" },
  amber: { label: "Amber", bg: "#e0a100", text: "#241a00", soft: "#fbf1d6" },
  slate: { label: "Slate", bg: "#1f2937", text: "#ffffff", soft: "#eceef1" },
} as const;

export type SiteAccent = keyof typeof SITE_ACCENTS;
