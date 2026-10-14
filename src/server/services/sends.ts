import { randomBytes } from "crypto";
import { env } from "@/lib/env";
import { AppError } from "./errors";
import { recordAudit } from "./audit";
import { sendMail } from "./mailer";
import type { Actor, Db } from "./types";

export type SendReportInput = {
  reportId: string;
  recipientEmail: string;
  recipientType: string;
};

function buildEmailHtml(params: {
  studentName: string;
  number: string;
  type: string;
  period: string;
  link: string;
  expires: string;
}) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#0f172a">
    <h2 style="color:#1f5df5">Laporan PKL — ${env.companyName}</h2>
    <p>Berikut kami sampaikan laporan kegiatan PKL berikut:</p>
    <table style="border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0"><b>Siswa</b></td><td>${params.studentName}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><b>Nomor Laporan</b></td><td>${params.number}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><b>Jenis</b></td><td>${params.type}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><b>Periode</b></td><td>${params.period}</td></tr>
    </table>
    <p style="margin:20px 0">
      <a href="${params.link}" style="background:#1f5df5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Buka Laporan (tautan aman)</a>
    </p>
    <p style="font-size:13px;color:#475569">Tautan ini bersifat rahasia dan berlaku sampai <b>${params.expires}</b>.</p>
  </div>`;
}

/** Kirim laporan final ke penerima melalui tautan aman (punya masa berlaku) + catat riwayat. */
export async function sendReport(db: Db, actor: Actor, input: SendReportInput) {
  if (actor.role !== "HRD" && actor.role !== "ADMIN") {
    throw new AppError("AKSES_DITOLAK", "Hanya HRD/Admin yang dapat mengirim laporan.", 403);
  }
  const report = await db.report.findUnique({
    where: { id: input.reportId },
    include: { student: { include: { user: true, school: true } } },
  });
  if (!report) throw new AppError("LAPORAN_TIDAK_DITEMUKAN", "Laporan tidak ditemukan.", 404);
  if (report.status !== "FINAL") {
    throw new AppError("LAPORAN_BELUM_FINAL", "Hanya laporan yang sudah final yang dapat dikirim.");
  }

  const email = (input.recipientEmail ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("EMAIL_TIDAK_VALID", "Alamat email penerima tidak valid.");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.linkExpiryDays * 24 * 60 * 60 * 1000);
  const link = `${env.appUrl}/invite/${token}`;
  const period = `${report.periodStart.toISOString().slice(0, 10)} s.d. ${report.periodEnd
    .toISOString()
    .slice(0, 10)}`;

  const html = buildEmailHtml({
    studentName: report.student.user.name,
    number: report.number,
    type: report.type,
    period,
    link,
    expires: expiresAt.toISOString().slice(0, 10),
  });

  const result = await sendMail(db, {
    to: email,
    subject: `Laporan PKL ${report.student.user.name} — ${report.number}`,
    html,
  });

  const send = await db.reportSend.create({
    data: {
      reportId: report.id,
      recipientEmail: email,
      recipientType: (input.recipientType || "SEKOLAH").toUpperCase(),
      token,
      expiresAt,
      status: result.status,
      error: result.error,
      createdById: actor.userId,
    },
  });

  await recordAudit(db, {
    actor,
    action: "LAPORAN_DIKIRIM",
    entityType: "Report",
    entityId: report.id,
    note: `Terkirim ke ${email} (${send.recipientType}) — ${result.status}.`,
  });

  return { send, link, status: result.status };
}

/** Ambil tautan aman berdasarkan token; tandai sebagai dibuka; cek masa berlaku. */
export async function getSendByToken(db: Db, token: string) {
  const send = await db.reportSend.findUnique({
    where: { token },
    include: {
      report: {
        include: {
          student: { include: { user: true, school: true } },
          items: { include: { log: true }, orderBy: { log: { date: "asc" } } },
        },
      },
    },
  });
  if (!send) return null;

  const expired = send.expiresAt.getTime() < Date.now();
  if (!expired && !send.openedAt) {
    const openedAt = new Date();
    await db.reportSend.update({ where: { id: send.id }, data: { openedAt } });
    send.openedAt = openedAt;
  }
  return { send, expired };
}

export async function listSendsForReport(db: Db, reportId: string) {
  return db.reportSend.findMany({ where: { reportId }, orderBy: { sentAt: "desc" } });
}
