import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Encrypts integration credentials (e.g. a WhatsApp access token) before
// they're stored in the database, so a DB leak alone doesn't hand over
// live third-party credentials. AES-256-GCM with a key derived from
// INTEGRATIONS_ENCRYPTION_KEY — set once, never rotated casually (rotating
// it makes every previously-saved credential undecryptable).
function getKey(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY is not set — see .env.example.");
  }
  return scryptSync(secret, "vanspire-integrations", 32);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptSecret(stored: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted value.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
