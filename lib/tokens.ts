import { randomBytes } from "crypto";

// Used for the unlisted public status-page token on each lead — 16 bytes
// of hex is unguessable enough for a low-sensitivity "view your own
// booking status" link without needing an account.
export function generatePublicToken(): string {
  return randomBytes(16).toString("hex");
}
