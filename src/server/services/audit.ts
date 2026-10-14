import type { Db, AuditInput } from "./types";

/** Catat setiap perubahan status ke tabel audit (jejak audit). */
export async function recordAudit(db: Db, input: AuditInput) {
  await db.auditLog.create({
    data: {
      actorId: input.actor.userId,
      actorName: input.actor.name,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      note: input.note ?? null,
    },
  });
}
