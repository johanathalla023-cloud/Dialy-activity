import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ATTENDANCE_LABEL, dayName, formatDate, formatDateTime } from "@/lib/format";

export const runtime = "nodejs";

/** Ganti karakter non-Latin1 agar aman dengan font bawaan PDFKit. */
function sanitize(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Hanya PEMBIMBING dan ADMIN yang boleh akses
  if (user.role !== "PEMBIMBING" && user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const log = await prisma.dailyReport.findUnique({
    where: { id: params.id },
    include: {
      student: {
        include: {
          user: true,
          school: true,
        },
      },
    },
  });

  if (!log) {
    return new NextResponse("Log tidak ditemukan.", { status: 404 });
  }

  // Pastikan PEMBIMBING hanya bisa akses log siswa bimbingannya
  if (user.role === "PEMBIMBING" && log.placementId) {
    const owns = await prisma.placement.findFirst({
      where: { id: log.placementId, supervisorId: user.supervisorId! },
    });
    if (!owns) {
      return new NextResponse("Akses ditolak.", { status: 403 });
    }
  }

  // Ambil file lampiran jika ada
  const [photo, proof] = await Promise.all([
    log.photoId ? prisma.fileAsset.findUnique({ where: { id: log.photoId } }) : null,
    log.proofId ? prisma.fileAsset.findUnique({ where: { id: log.proofId } }) : null,
  ]);

  // Buat PDF
  const doc = new PDFDocument({ size: "A4", margin: 50, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width - 100;

  // ── Header ──────────────────────────────────────────────────────────
  doc.fontSize(16).fillColor("#1f5df5").text("TRANS HYBRID", { align: "left" });
  doc.moveDown(0.2);
  doc.fontSize(14).fillColor("#0f172a").text("BUKTI LOG KEGIATAN HARIAN PKL");
  doc.moveDown(0.5);

  // ── Info Log ─────────────────────────────────────────────────────────
  doc.fontSize(10).fillColor("#475569");
  doc.text(`Tanggal     : ${dayName(log.date)}, ${formatDate(log.date)}`);
  doc.text(`Kehadiran   : ${ATTENDANCE_LABEL[log.attendance]}`);
  doc.text(`Status      : ${log.status.replace("DISETUJUI", "Disetujui").replace("DIAJUKAN", "Diajukan").replace("DRAFT", "Draft").replace("REVISI", "Perlu Revisi")}`);
  if (log.submittedAt) {
    doc.text(`Diajukan    : ${formatDateTime(log.submittedAt)}`);
  }
  if (log.reviewedAt) {
    doc.text(`Diperiksa   : ${formatDateTime(log.reviewedAt)}`);
  }
  doc.moveDown(0.8);

  // ── Identitas Siswa ───────────────────────────────────────────────────
  doc.fillColor("#0f172a").fontSize(12).text("Identitas Siswa");
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#334155");
  doc.text(`Nama        : ${sanitize(log.student.user.name)}`);
  doc.text(`NIS         : ${sanitize(log.student.nis)}`);
  doc.text(`Kelas       : ${sanitize(log.student.className) || "-"}`);
  doc.text(`Sekolah     : ${sanitize(log.student.school.name)}`);
  doc.moveDown(0.8);

  // ── Detail Kegiatan ───────────────────────────────────────────────────
  doc.fillColor("#0f172a").fontSize(12).text("Detail Kegiatan");
  doc.moveDown(0.3);

  doc.rect(50, doc.y, pageWidth, 1).fill("#e2e8f0");
  doc.moveDown(0.4);

  if (log.attendance === "HADIR") {
    doc.fontSize(10).fillColor("#334155");
    doc.text(`Jam Masuk   : ${sanitize(log.checkIn) || "-"}`);
    doc.text(`Jam Keluar  : ${sanitize(log.checkOut) || "-"}`);
    doc.moveDown(0.4);
    doc.fillColor("#0f172a").text("Kegiatan:");
    doc.fillColor("#334155").text(sanitize(log.activity) || "-", { indent: 10, width: pageWidth - 10 });
    doc.moveDown(0.4);
    doc.fillColor("#0f172a").text("Hasil:");
    doc.fillColor("#334155").text(sanitize(log.result) || "-", { indent: 10, width: pageWidth - 10 });
    doc.moveDown(0.4);
    doc.fillColor("#0f172a").text("Kendala:");
    doc.fillColor("#334155").text(sanitize(log.obstacle) || "-", { indent: 10, width: pageWidth - 10 });
    if (photo) {
      doc.moveDown(0.4);
      doc.fillColor("#334155").text(`Foto        : ${sanitize(photo.filename)}`);
    }
  } else {
    doc.fontSize(10).fillColor("#334155");
    doc.fillColor("#0f172a").text("Alasan:");
    doc.fillColor("#334155").text(sanitize(log.reason) || "-", { indent: 10, width: pageWidth - 10 });
    if (proof) {
      doc.moveDown(0.4);
      doc.fillColor("#334155").text(`Bukti       : ${sanitize(proof.filename)}`);
    }
  }

  // ── Catatan Pembimbing ────────────────────────────────────────────────
  if (log.supervisorNote) {
    doc.moveDown(0.8);
    doc.fillColor("#0f172a").fontSize(12).text("Catatan Pembimbing");
    doc.moveDown(0.3);
    doc.rect(50, doc.y, pageWidth, 1).fill("#e2e8f0");
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#334155").text(sanitize(log.supervisorNote), { width: pageWidth });
  }

  // ── Tanda Tangan ──────────────────────────────────────────────────────
  if (doc.y > doc.page.height - 200) doc.addPage();
  doc.moveDown(2);
  const signY = doc.y;

  doc.fillColor("#0f172a").fontSize(10);
  doc.text("Siswa PKL", 50, signY);
  doc.text("Pembimbing Industri", 330, signY);
  doc.fillColor("#475569").fontSize(9);
  doc.text(`${sanitize(log.student.user.name)}`, 50, signY + 14);
  doc.moveDown(0.3);
  doc.fillColor("#475569").fontSize(9);
  doc.text("(..............................)", 50, signY + 70);
  doc.text("(..............................)", 330, signY + 70);

  // ── Footer ────────────────────────────────────────────────────────────
  doc.fontSize(8).fillColor("#94a3b8").text(
    "Dicetak otomatis oleh Daily Activity PKL - Trans Hybrid",
    50,
    doc.page.height - 60,
    { align: "center", width: pageWidth },
  );

  doc.end();
  const pdf = await done;

  const tanggal = log.date.toISOString().slice(0, 10);
  const filename = `Log-${sanitize(log.student.user.name).replace(/\s+/g, "-")}-${tanggal}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
