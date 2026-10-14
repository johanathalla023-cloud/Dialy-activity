import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  AppError,
  approveLog,
  createReport,
  finalizeReport,
  getReportForActor,
  getSendByToken,
  requestLogRevision,
  requestReportRevision,
  saveStudentLog,
  sendReport,
  submitLog,
  verifyReport,
} from "@/server/services";
import { createWorld, testPrisma, truncateAll, type World } from "./helpers";

const db = testPrisma();
let w: World;

function hadir(date: string) {
  return {
    date,
    attendance: "HADIR" as const,
    checkIn: "08:00",
    checkOut: "16:00",
    activity: "Membantu pekerjaan operasional",
    result: "Selesai sesuai target",
    obstacle: "Tidak ada",
  };
}

async function expectAppError(promise: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (err) {
    caught = err;
  }
  expect(caught, `mengharapkan error ${code}`).toBeInstanceOf(AppError);
  expect((caught as AppError).code).toBe(code);
}

async function approvedLog(date = "2024-02-12"): Promise<string> {
  const draft = await saveStudentLog(db, w.studentActor, hadir(date));
  await submitLog(db, w.studentActor, draft.id);
  await approveLog(db, w.supervisorActor, draft.id, "Disetujui");
  return draft.id;
}

beforeEach(async () => {
  await truncateAll(db);
  w = await createWorld(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("Aturan log harian", () => {
  it("menyimpan dua kali pada tanggal yang sama menghasilkan satu log (1 log/siswa/tanggal)", async () => {
    const first = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    const second = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));

    expect(second.id).toBe(first.id);
    const count = await db.dailyReport.count({ where: { studentId: w.student.id } });
    expect(count).toBe(1);

    await expect(
      db.dailyReport.create({
        data: {
          studentId: w.student.id,
          date: new Date(Date.UTC(2024, 1, 12)),
          attendance: "HADIR",
          status: "DRAFT",
        },
      }),
    ).rejects.toThrow();
  });

  it("log berstatus DIAJUKAN tidak dapat diubah", async () => {
    const draft = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    await submitLog(db, w.studentActor, draft.id);

    await expectAppError(saveStudentLog(db, w.studentActor, hadir("2024-02-12")), "LOG_MENUNGGU_REVIEW");
  });

  it("log berstatus DISETUJUI terkunci dan tidak dapat diubah", async () => {
    await approvedLog("2024-02-12");
    await expectAppError(saveStudentLog(db, w.studentActor, hadir("2024-02-12")), "LOG_TERKUNCI");
  });

  it("siswa hanya dapat mengajukan log miliknya sendiri", async () => {
    const draft = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    await expectAppError(submitLog(db, w.student2Actor, draft.id), "AKSES_DITOLAK");
  });

  it("mengaitkan log yang diajukan ke penempatan pembimbing aktif", async () => {
    const draft = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    const placement = await db.placement.findFirst({
      where: { studentId: w.student.id, active: true },
    });

    const submitted = await submitLog(db, w.studentActor, draft.id);

    expect(submitted.placementId).toBe(placement?.id);
  });

  it("menolak pengajuan jika siswa belum memiliki pembimbing aktif", async () => {
    await db.placement.updateMany({
      where: { studentId: w.student.id, active: true },
      data: { active: false },
    });
    const draft = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));

    await expectAppError(submitLog(db, w.studentActor, draft.id), "PENEMPATAN_TIDAK_DITEMUKAN");

    const unchanged = await db.dailyReport.findUnique({ where: { id: draft.id } });
    expect(unchanged?.status).toBe("DRAFT");
  });

  it("pembimbing yang tidak ditugaskan tidak dapat menyetujui", async () => {
    const draft = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    await submitLog(db, w.studentActor, draft.id);
    await expectAppError(approveLog(db, w.otherSupervisorActor, draft.id), "AKSES_DITOLAK");
  });

  it("alur ajukan -> setujui mengubah status dan mencatat jejak audit", async () => {
    const draft = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    await submitLog(db, w.studentActor, draft.id);
    const approved = await approveLog(db, w.supervisorActor, draft.id, "Bagus");
    expect(approved.status).toBe("DISETUJUI");

    const actions = (
      await db.auditLog.findMany({
        where: { entityType: "DailyReport", entityId: draft.id },
        orderBy: { createdAt: "asc" },
      })
    ).map((a) => a.action);

    expect(actions).toContain("LOG_DIBUAT");
    expect(actions).toContain("LOG_DIAJUKAN");
    expect(actions).toContain("LOG_DISETUJUI");
  });

  it("permintaan revisi menyimpan catatan dan tercatat di audit", async () => {
    const draft = await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    await submitLog(db, w.studentActor, draft.id);
    const revised = await requestLogRevision(db, w.supervisorActor, draft.id, "Lengkapi hasil");
    expect(revised.status).toBe("REVISI");
    expect(revised.supervisorNote).toBe("Lengkapi hasil");
  });
});

describe("Aturan laporan", () => {
  it("laporan hanya dibuat dari log yang sudah disetujui", async () => {
    await saveStudentLog(db, w.studentActor, hadir("2024-02-12"));
    await expectAppError(
      createReport(db, w.hrdActor, {
        studentId: w.student.id,
        type: "MINGGUAN",
        periodStart: "2024-02-01",
        periodEnd: "2024-02-29",
      }),
      "TIDAK_ADA_LOG_DISETUJUI",
    );

    await approvedLog("2024-02-12");
    const report = await createReport(db, w.hrdActor, {
      studentId: w.student.id,
      type: "MINGGUAN",
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
    });
    expect(report.number).toMatch(/TH-PKL/);
    const items = await db.reportItem.count({ where: { reportId: report.id } });
    expect(items).toBe(1);
  });

  it("hanya HRD/Admin yang dapat membuat laporan", async () => {
    await approvedLog("2024-02-12");
    await expectAppError(
      createReport(db, w.supervisorActor, {
        studentId: w.student.id,
        type: "MINGGUAN",
        periodStart: "2024-02-01",
        periodEnd: "2024-02-29",
      }),
      "AKSES_DITOLAK",
    );
  });

  it("laporan final tidak dapat diminta revisi", async () => {
    await approvedLog("2024-02-12");
    const report = await createReport(db, w.hrdActor, {
      studentId: w.student.id,
      type: "MINGGUAN",
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
    });
    await finalizeReport(db, w.hrdActor, report.id);
    await expectAppError(requestReportRevision(db, w.hrdActor, report.id, "revisi"), "SUDAH_FINAL");
  });

  it("siswa tidak dapat mengakses laporan siswa lain", async () => {
    await approvedLog("2024-02-12");
    const report = await createReport(db, w.hrdActor, {
      studentId: w.student.id,
      type: "MINGGUAN",
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
    });
    const visible = await getReportForActor(db, w.student2Actor, report.id);
    expect(visible).toBeNull();

    const own = await getReportForActor(db, w.studentActor, report.id);
    expect(own?.id).toBe(report.id);
  });
});

describe("Pengiriman & verifikasi", () => {
  async function finalReport() {
    await approvedLog("2024-02-12");
    const report = await createReport(db, w.hrdActor, {
      studentId: w.student.id,
      type: "MINGGUAN",
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
    });
    await finalizeReport(db, w.hrdActor, report.id);
    return report;
  }

  it("hanya laporan final yang dapat dikirim", async () => {
    await approvedLog("2024-02-12");
    const report = await createReport(db, w.hrdActor, {
      studentId: w.student.id,
      type: "MINGGUAN",
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
    });
    await expectAppError(
      sendReport(db, w.hrdActor, {
        reportId: report.id,
        recipientEmail: "sekolah@uji.test",
        recipientType: "SEKOLAH",
      }),
      "LAPORAN_BELUM_FINAL",
    );
  });

  it("mengirim laporan mencatat riwayat dan tautan aman dapat dibuka", async () => {
    const report = await finalReport();
    const { send, link } = await sendReport(db, w.hrdActor, {
      reportId: report.id,
      recipientEmail: "sekolah@uji.test",
      recipientType: "SEKOLAH",
    });
    expect(link).toContain("/invite/");
    expect(send.status).not.toBe(undefined);

    const opened = await getSendByToken(db, send.token);
    expect(opened).not.toBeNull();
    expect(opened?.expired).toBe(false);
    expect(opened?.send.openedAt).not.toBeNull();

    const history = await db.reportSend.count({ where: { reportId: report.id } });
    expect(history).toBe(1);
  });

  it("tautan aman kedaluwarsa setelah masa berlaku", async () => {
    const report = await finalReport();
    const { send } = await sendReport(db, w.hrdActor, {
      reportId: report.id,
      recipientEmail: "sekolah@uji.test",
      recipientType: "SEKOLAH",
    });

    await db.reportSend.update({
      where: { id: send.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const opened = await getSendByToken(db, send.token);
    expect(opened?.expired).toBe(true);
  });

  it("token verifikasi (QR) mengembalikan laporan asli", async () => {
    const report = await finalReport();
    const result = await verifyReport(db, report.verificationToken);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.report.number).toBe(report.number);
      expect(result.report.items.length).toBe(1);
    }

    const missing = await verifyReport(db, "token-palsu");
    expect(missing.found).toBe(false);
  });
});
