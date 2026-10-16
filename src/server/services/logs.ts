import type { Attendance, DailyReport } from "@prisma/client";
import { AppError } from "./errors";
import { recordAudit } from "./audit";
import { todayDate, toDateOnly } from "@/lib/format";
import type { Actor, Db } from "./types";

export type StudentLogInput = {
  date: string;
  attendance: Attendance;
  checkIn?: string | null;
  checkOut?: string | null;
  activity?: string | null;
  result?: string | null;
  obstacle?: string | null;
  photoId?: string | null;
  reason?: string | null;
  proofId?: string | null;
};

function clean(value?: string | null): string | null {
  const v = (value ?? "").trim();
  return v.length ? v : null;
}

/** Validasi isi log sesuai jenis kehadiran. */
export function validateLogInput(input: StudentLogInput) {
  if (!input.date) throw new AppError("TANGGAL_WAJIB", "Tanggal wajib diisi.");
  const date = toDateOnly(input.date);
  const today = todayDate();
  if (date.getTime() > today.getTime()) {
    throw new AppError("TANGGAL_MASA_DEPAN", "Tanggal tidak boleh melebihi hari ini.");
  }

  if (input.attendance === "HADIR") {
    if (!clean(input.checkIn)) throw new AppError("JAM_MASUK_WAJIB", "Jam masuk wajib diisi untuk status Hadir.");
    if (!clean(input.checkOut)) throw new AppError("JAM_KELUAR_WAJIB", "Jam keluar wajib diisi untuk status Hadir.");
    if (!clean(input.activity)) throw new AppError("KEGIATAN_WAJIB", "Uraian kegiatan wajib diisi untuk status Hadir.");
    return {
      date,
      attendance: input.attendance,
      checkIn: clean(input.checkIn),
      checkOut: clean(input.checkOut),
      activity: clean(input.activity),
      result: clean(input.result),
      obstacle: clean(input.obstacle),
      photoId: clean(input.photoId),
      reason: null,
      proofId: null,
    };
  }

  if (!clean(input.reason)) {
    throw new AppError("ALASAN_WAJIB", "Alasan wajib diisi untuk status Izin/Sakit.");
  }
  return {
    date,
    attendance: input.attendance,
    checkIn: null,
    checkOut: null,
    activity: null,
    result: null,
    obstacle: null,
    photoId: null,
    reason: clean(input.reason),
    proofId: clean(input.proofId),
  };
}

/**
 * Simpan draft log (buat baru atau perbarui).
 * Aturan: 1 log per siswa per tanggal; log DISETUJUI tidak bisa diubah;
 * log yang sedang DIAJUKAN tidak bisa diubah.
 */
export async function saveStudentLog(
  db: Db,
  actor: Actor,
  input: StudentLogInput,
): Promise<DailyReport> {
  const studentId = actor.studentId;
  if (!studentId) throw new AppError("BUKAN_SISWA", "Hanya siswa yang dapat mengisi log harian.", 403);

  const data = validateLogInput(input);

  const existing = await db.dailyReport.findUnique({
    where: { studentId_date: { studentId, date: data.date } },
  });

  if (existing) {
    if (existing.status === "DISETUJUI") {
      throw new AppError("LOG_TERKUNCI", "Log yang sudah disetujui tidak dapat diubah.");
    }
    if (existing.status === "DIAJUKAN") {
      throw new AppError("LOG_MENUNGGU_REVIEW", "Log sedang menunggu pemeriksaan pembimbing dan tidak dapat diubah.");
    }
    const updated = await db.dailyReport.update({
      where: { id: existing.id },
      data: { ...data, status: existing.status === "REVISI" ? "REVISI" : "DRAFT" },
    });
    await recordAudit(db, {
      actor,
      action: "LOG_DIPERBARUI",
      entityType: "DailyReport",
      entityId: updated.id,
      fromStatus: existing.status,
      toStatus: updated.status,
    });
    return updated;
  }

  const placement = await db.placement.findFirst({
    where: { studentId, active: true },
    orderBy: { createdAt: "desc" },
  });

  try {
    const created = await db.dailyReport.create({
      data: {
        studentId,
        placementId: placement?.id ?? null,
        date: data.date,
        attendance: data.attendance,
        status: "DRAFT",
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        activity: data.activity,
        result: data.result,
        obstacle: data.obstacle,
        photoId: data.photoId,
        reason: data.reason,
        proofId: data.proofId,
      },
    });
    await recordAudit(db, {
      actor,
      action: "LOG_DIBUAT",
      entityType: "DailyReport",
      entityId: created.id,
      toStatus: "DRAFT",
    });
    return created;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      throw new AppError("LOG_DUPLIKAT", "Sudah ada log untuk tanggal tersebut.");
    }
    throw err;
  }
}

/** Ajukan log untuk diperiksa pembimbing. DRAFT/REVISI -> DIAJUKAN. */
export async function submitLog(db: Db, actor: Actor, logId: string): Promise<DailyReport> {
  const log = await db.dailyReport.findUnique({ where: { id: logId } });
  if (!log) throw new AppError("LOG_TIDAK_DITEMUKAN", "Log tidak ditemukan.", 404);
  if (log.studentId !== actor.studentId) {
    throw new AppError("AKSES_DITOLAK", "Anda hanya dapat mengajukan log milik sendiri.", 403);
  }
  if (log.status !== "DRAFT" && log.status !== "REVISI") {
    throw new AppError("STATUS_TIDAK_VALID", "Log ini tidak dapat diajukan pada status saat ini.");
  }

  const placement = await db.placement.findFirst({
    where: { studentId: log.studentId, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!placement) {
    throw new AppError(
      "PENEMPATAN_TIDAK_DITEMUKAN",
      "Belum ada pembimbing aktif untuk siswa ini. Hubungi HRD agar penempatan dibuat sebelum mengajukan log.",
    );
  }

  validateLogInput({
    date: log.date.toISOString(),
    attendance: log.attendance,
    checkIn: log.checkIn,
    checkOut: log.checkOut,
    activity: log.activity,
    result: log.result,
    obstacle: log.obstacle,
    photoId: log.photoId,
    reason: log.reason,
    proofId: log.proofId,
  });

  const updated = await db.dailyReport.update({
    where: { id: log.id },
    data: {
      placementId: placement.id,
      status: "DIAJUKAN",
      submittedAt: new Date(),
      supervisorNote: null,
    },
  });
  await recordAudit(db, {
    actor,
    action: "LOG_DIAJUKAN",
    entityType: "DailyReport",
    entityId: updated.id,
    fromStatus: log.status,
    toStatus: "DIAJUKAN",
  });
  return updated;
}

async function assertCanReview(db: Db, actor: Actor, log: DailyReport) {
  if (actor.role === "ADMIN" || actor.role === "HRD") return;
  if (actor.role !== "PEMBIMBING" || !actor.supervisorId) {
    throw new AppError("AKSES_DITOLAK", "Hanya pembimbing yang dapat memeriksa log.", 403);
  }
  const placement = log.placementId
    ? await db.placement.findFirst({
        where: { id: log.placementId, supervisorId: actor.supervisorId },
      })
    : null;
  if (!placement) {
    throw new AppError("AKSES_DITOLAK", "Anda bukan pembimbing siswa ini.", 403);
  }
}

/** Setujui log. DIAJUKAN -> DISETUJUI (log terkunci). */
export async function approveLog(
  db: Db,
  actor: Actor,
  logId: string,
  note?: string | null,
): Promise<DailyReport> {
  const log = await db.dailyReport.findUnique({ where: { id: logId } });
  if (!log) throw new AppError("LOG_TIDAK_DITEMUKAN", "Log tidak ditemukan.", 404);
  await assertCanReview(db, actor, log);
  if (log.status !== "DIAJUKAN") {
    throw new AppError("STATUS_TIDAK_VALID", "Hanya log yang berstatus Diajukan yang dapat disetujui.");
  }

  const updated = await db.dailyReport.update({
    where: { id: log.id },
    data: {
      status: "DISETUJUI",
      reviewedAt: new Date(),
      reviewedById: actor.userId,
      supervisorNote: clean(note),
    },
  });
  await recordAudit(db, {
    actor,
    action: "LOG_DISETUJUI",
    entityType: "DailyReport",
    entityId: updated.id,
    fromStatus: log.status,
    toStatus: "DISETUJUI",
    note: clean(note),
  });
  return updated;
}

/** Minta revisi log. DIAJUKAN -> REVISI. */
export async function requestLogRevision(
  db: Db,
  actor: Actor,
  logId: string,
  note: string,
): Promise<DailyReport> {
  const log = await db.dailyReport.findUnique({ where: { id: logId } });
  if (!log) throw new AppError("LOG_TIDAK_DITEMUKAN", "Log tidak ditemukan.", 404);
  await assertCanReview(db, actor, log);
  if (log.status !== "DIAJUKAN") {
    throw new AppError("STATUS_TIDAK_VALID", "Hanya log yang berstatus Diajukan yang dapat diminta revisi.");
  }
  if (!clean(note)) throw new AppError("CATATAN_WAJIB", "Catatan revisi wajib diisi.");

  const updated = await db.dailyReport.update({
    where: { id: log.id },
    data: {
      status: "REVISI",
      reviewedAt: new Date(),
      reviewedById: actor.userId,
      supervisorNote: clean(note),
    },
  });
  await recordAudit(db, {
    actor,
    action: "LOG_DIMINTA_REVISI",
    entityType: "DailyReport",
    entityId: updated.id,
    fromStatus: log.status,
    toStatus: "REVISI",
    note: clean(note),
  });
  return updated;
}

/* ----------------------------- Query terbatas peran ----------------------------- */

export async function listStudentLogs(db: Db, studentId: string) {
  return db.dailyReport.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
  });
}

export async function listPendingApprovals(db: Db, actor: Actor) {
  if (!actor.supervisorId) return [];
  return db.dailyReport.findMany({
    where: {
      status: "DIAJUKAN",
      placement: { is: { supervisorId: actor.supervisorId } },
    },
    include: { student: { include: { user: true, school: true } } },
    orderBy: { submittedAt: "asc" },
  });
}

export async function listAllLogs(db: Db) {
  return db.dailyReport.findMany({
    include: { student: { include: { user: true, school: true } } },
    orderBy: { date: "desc" },
    take: 200,
  });
}
