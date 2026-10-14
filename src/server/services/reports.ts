import { randomBytes } from "crypto";
import type { ReportType } from "@prisma/client";
import { AppError } from "./errors";
import { recordAudit } from "./audit";
import { romanMonth, toDateOnly } from "@/lib/format";
import type { Actor, Db } from "./types";

const TYPE_CODE: Record<ReportType, string> = {
  MINGGUAN: "MGG",
  BULANAN: "BLN",
  AKHIR: "AKH",
};

function requireManager(actor: Actor) {
  if (actor.role !== "HRD" && actor.role !== "ADMIN") {
    throw new AppError("AKSES_DITOLAK", "Hanya HRD/Admin yang dapat mengelola laporan.", 403);
  }
}

async function generateReportNumber(db: Db, type: ReportType, date: Date): Promise<string> {
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const count = await db.report.count({ where: { createdAt: { gte: start, lt: end } } });
  const seq = String(count + 1).padStart(3, "0");
  return `${seq}/TH-PKL/${TYPE_CODE[type]}/${romanMonth(date.getUTCMonth())}/${year}`;
}

export type CreateReportInput = {
  studentId: string;
  type: ReportType;
  periodStart: string | Date;
  periodEnd: string | Date;
};

/** Buat laporan HANYA dari log yang sudah DISETUJUI pada rentang periode. */
export async function createReport(db: Db, actor: Actor, input: CreateReportInput) {
  requireManager(actor);
  const periodStart = toDateOnly(input.periodStart);
  const periodEnd = toDateOnly(input.periodEnd);
  if (periodStart.getTime() > periodEnd.getTime()) {
    throw new AppError("PERIODE_TIDAK_VALID", "Tanggal awal tidak boleh melebihi tanggal akhir.");
  }

  const logs = await db.dailyReport.findMany({
    where: {
      studentId: input.studentId,
      status: "DISETUJUI",
      date: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { date: "asc" },
  });

  if (logs.length === 0) {
    throw new AppError(
      "TIDAK_ADA_LOG_DISETUJUI",
      "Tidak ada log yang sudah disetujui pada periode tersebut. Laporan hanya dibuat dari log yang disetujui.",
    );
  }

  const number = await generateReportNumber(db, input.type, periodStart);
  const verificationToken = randomBytes(24).toString("hex");

  const report = await db.report.create({
    data: {
      number,
      type: input.type,
      studentId: input.studentId,
      periodStart,
      periodEnd,
      status: "DRAFT",
      verificationToken,
      createdById: actor.userId,
      items: { create: logs.map((log) => ({ logId: log.id })) },
    },
  });

  await recordAudit(db, {
    actor,
    action: "LAPORAN_DIBUAT",
    entityType: "Report",
    entityId: report.id,
    toStatus: "DRAFT",
    note: `Nomor ${number}, ${logs.length} log disetujui.`,
  });

  return report;
}

/** Segarkan daftar log pada laporan draft/revisi dengan log yang baru disetujui. */
export async function refreshReportItems(db: Db, actor: Actor, reportId: string) {
  requireManager(actor);
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError("LAPORAN_TIDAK_DITEMUKAN", "Laporan tidak ditemukan.", 404);
  if (report.status === "FINAL") {
    throw new AppError("LAPORAN_FINAL", "Laporan final tidak dapat diubah.");
  }

  const logs = await db.dailyReport.findMany({
    where: {
      studentId: report.studentId,
      status: "DISETUJUI",
      date: { gte: report.periodStart, lte: report.periodEnd },
    },
    orderBy: { date: "asc" },
  });

  await db.reportItem.deleteMany({ where: { reportId } });
  await db.report.update({
    where: { id: reportId },
    data: { items: { create: logs.map((log) => ({ logId: log.id })) } },
  });

  await recordAudit(db, {
    actor,
    action: "LAPORAN_DISEGARKAN",
    entityType: "Report",
    entityId: reportId,
    fromStatus: report.status,
    toStatus: report.status,
    note: `${logs.length} log disetujui.`,
  });

  return { count: logs.length };
}

/** Layak -> finalkan laporan. */
export async function finalizeReport(db: Db, actor: Actor, reportId: string) {
  requireManager(actor);
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { _count: { select: { items: true } } },
  });
  if (!report) throw new AppError("LAPORAN_TIDAK_DITEMUKAN", "Laporan tidak ditemukan.", 404);
  if (report.status === "FINAL") throw new AppError("SUDAH_FINAL", "Laporan sudah final.");
  if (report._count.items === 0) {
    throw new AppError("LAPORAN_KOSONG", "Laporan belum memiliki log yang disetujui.");
  }

  const updated = await db.report.update({
    where: { id: reportId },
    data: { status: "FINAL", finalizedAt: new Date() },
  });
  await recordAudit(db, {
    actor,
    action: "LAPORAN_DIFINALKAN",
    entityType: "Report",
    entityId: reportId,
    fromStatus: report.status,
    toStatus: "FINAL",
  });
  return updated;
}

/** Belum layak -> minta revisi ke siswa. */
export async function requestReportRevision(db: Db, actor: Actor, reportId: string, note: string) {
  requireManager(actor);
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError("LAPORAN_TIDAK_DITEMUKAN", "Laporan tidak ditemukan.", 404);
  if (report.status === "FINAL") throw new AppError("SUDAH_FINAL", "Laporan final tidak dapat direvisi.");
  const trimmed = (note ?? "").trim();
  if (!trimmed) throw new AppError("CATATAN_WAJIB", "Catatan revisi wajib diisi.");

  const updated = await db.report.update({
    where: { id: reportId },
    data: { status: "REVISI", note: trimmed },
  });
  await recordAudit(db, {
    actor,
    action: "LAPORAN_DIMINTA_REVISI",
    entityType: "Report",
    entityId: reportId,
    fromStatus: report.status,
    toStatus: "REVISI",
    note: trimmed,
  });
  return updated;
}

/* ----------------------------- Query ----------------------------- */

const reportInclude = {
  student: { include: { user: true, school: true } },
  items: { include: { log: true }, orderBy: { log: { date: "asc" as const } } },
  sends: { orderBy: { sentAt: "desc" as const } },
} as const;

export async function getReport(db: Db, reportId: string) {
  return db.report.findUnique({ where: { id: reportId }, include: reportInclude });
}

export type ReportDetail = NonNullable<Awaited<ReturnType<typeof getReport>>>;

export async function listReportsForActor(db: Db, actor: Actor) {
  const where =
    actor.role === "SISWA"
      ? { studentId: actor.studentId ?? "__none__" }
      : actor.role === "PEMBIMBING" && actor.supervisorId
        ? { student: { placements: { some: { supervisorId: actor.supervisorId } } } }
        : {};
  return db.report.findMany({
    where,
    include: { student: { include: { user: true, school: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReportForActor(db: Db, actor: Actor, reportId: string) {
  const report = await getReport(db, reportId);
  if (!report) return null;
  if (actor.role === "SISWA" && report.studentId !== actor.studentId) return null;
  if (actor.role === "PEMBIMBING") {
    if (!actor.supervisorId) return null;
    const placement = await db.placement.findFirst({
      where: { studentId: report.studentId, supervisorId: actor.supervisorId },
    });
    if (!placement) return null;
  }
  return report;
}

/** Verifikasi publik laporan berdasarkan token (untuk hasil scan QR). */
export async function verifyReport(db: Db, token: string) {
  const report = await db.report.findUnique({
    where: { verificationToken: token },
    include: {
      student: { include: { user: true, school: true } },
      items: { include: { log: true }, orderBy: { log: { date: "asc" } } },
    },
  });
  if (!report) return { found: false as const };
  return { found: true as const, report };
}
