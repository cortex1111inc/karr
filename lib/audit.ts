import "server-only";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { log } from "@/lib/log";

export type AuditInput = {
  action: string; // e.g. "invoice.void"
  summary: string; // human sentence; no secrets, no full phone/email lists
  targetType?: string;
  targetId?: string;
};

// Best effort: an audit write failing must never block the action it
// describes, but it is logged so the gap is visible.
export async function audit(user: Pick<CurrentUser, "id" | "fullName" | "orgId">, input: AuditInput) {
  try {
    await db.insert(auditLog).values({
      orgId: user.orgId,
      actorId: user.id,
      actorName: user.fullName,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: input.summary.slice(0, 500),
    });
  } catch (error) {
    log.error("audit_write_failed", { action: input.action, message: error instanceof Error ? error.message : String(error) });
  }
}
