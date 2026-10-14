import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { ATTENDANCE_LABEL, REPORT_TYPE_LABEL, dayName, formatDate } from "@/lib/format";
import type { ReportDetail } from "@/server/services";

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

function wrap(text: string, length: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > length) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) lines.push(current.trim());
  return lines.length ? lines : [""];
}

export async function buildReportPdf(report: ReportDetail): Promise<Buffer> {
  const verifyUrl = `${env.appUrl}/verify/${report.verificationToken}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, { type: "png", margin: 1, width: 220 });
  const final = report.status === "FINAL";

  const doc = new PDFDocument({ size: "A4", margin: 50, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width - 100;

  // Header
  doc.fontSize(16).fillColor("#1f5df5").text("TRANS HYBRID", { align: "left" });
  doc.moveDown(0.2);
  doc.fontSize(18).fillColor("#0f172a").text("LAPORAN KEGIATAN PKL");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#475569").text(`Nomor: ${sanitize(report.number)}`);
  doc.text(`Jenis: ${REPORT_TYPE_LABEL[report.type]}`);
  doc.text(
    `Periode: ${formatDate(report.periodStart)} s.d. ${formatDate(report.periodEnd)}`,
  );
  if (!final) {
    doc.moveDown(0.2);
    doc.fillColor("#b91c1c").text("STATUS: BELUM FINAL (DRAFT/REVISI)", { align: "left" });
  }
  doc.moveDown(0.8);

  // Identitas siswa
  doc.fillColor("#0f172a").fontSize(12).text("Identitas Siswa");
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#334155");
  doc.text(`Nama            : ${sanitize(report.student.user.name)}`);
  doc.text(`NIS              : ${sanitize(report.student.nis)}`);
  doc.text(`Kelas            : ${sanitize(report.student.className) || "-"}`);
  doc.text(`Sekolah        : ${sanitize(report.student.school.name)}`);
  doc.text(`Jumlah Log    : ${report.items.length} log disetujui`);
  doc.moveDown(0.8);

  // Header tabel
  const cols = { no: 50, tgl: 140, sum: 250, ket: pageWidth + 50 };
  doc.fillColor("#0f172a").fontSize(11).text("Rincian Kegiatan");
  doc.moveDown(0.3);

  const drawRowHeader = () => {
    const y = doc.y;
    doc.rect(50, y, pageWidth, 20).fill("#eef6ff");
    doc.fillColor("#1e3a8a").fontSize(9);
    doc.text("No", 54, y + 6);
    doc.text("Tanggal", cols.tgl, y + 6);
    doc.text("Kehadiran", cols.sum, y + 6);
    doc.text("Keterangan", 330, y + 6);
    doc.y = y + 22;
  };

  drawRowHeader();

  report.items.forEach((item, index) => {
    const log = item.log;
    const keterangan =
      log.attendance === "HADIR"
        ? `${sanitize(log.activity)}\nHasil: ${sanitize(log.result) || "-"}\nKendala: ${sanitize(log.obstacle) || "-"}`
        : `Alasan: ${sanitize(log.reason) || "-"}`;
    const lines = keterangan.split("\n").map((l) => wrap(l, 60));
    const flatLines = lines.map((arr) => arr[0] ?? "");
    const rowHeight = 16 + flatLines.length * 12 + 6;

    if (doc.y + rowHeight > doc.page.height - 120) {
      doc.addPage();
      drawRowHeader();
    }

    const y = doc.y;
    doc.fillColor("#334155").fontSize(9);
    doc.text(String(index + 1), 54, y + 4);
    doc.text(`${dayName(log.date)}\n${formatDate(log.date)}`, cols.tgl, y + 4, { width: 100 });
    doc.text(ATTENDANCE_LABEL[log.attendance], cols.sum, y + 4);
    doc.text(flatLines.join("\n"), 330, y + 4, { width: 210 });

    doc.y = y + rowHeight;
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#e2e8f0").stroke();
    doc.moveDown(0.15);
  });

  // Tanda tangan + QR
  if (doc.y > doc.page.height - 200) doc.addPage();
  doc.moveDown(1);
  const signY = doc.y;

  doc.image(qrBuffer, 50, signY, { width: 90 });
  doc.fillColor("#0f172a").fontSize(10).text("Verifikasi Keaslian", 150, signY);
  doc.fillColor("#475569").fontSize(9);
  doc.text("Pindai QR untuk memeriksa keaslian laporan ini.", 150, signY + 14, { width: 220 });
  doc.text(`Token: ${report.verificationToken.slice(0, 16)}...`, 150, signY + 30, { width: 260 });
  doc.text(sanitize(verifyUrl), 150, signY + 44, { width: 300 });

  doc.fillColor("#0f172a").fontSize(10);
  doc.text("Pembimbing Industri", 50, signY + 120);
  doc.text("HRD Trans Hybrid", 330, signY + 120);
  doc.fillColor("#475569").fontSize(9);
  doc.text("(..............................)", 50, signY + 170);
  doc.text("(..............................)", 330, signY + 170);

  doc.fontSize(8).fillColor("#94a3b8").text(
    `Dicetak otomatis oleh Daily Activity PKL - Trans Hybrid`,
    50,
    doc.page.height - 60,
    { align: "center", width: pageWidth },
  );

  doc.end();
  return done;
}
