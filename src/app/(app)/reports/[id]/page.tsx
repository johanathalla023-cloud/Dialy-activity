import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentActor } from "@/lib/actor";
import { env } from "@/lib/env";
import {
  finalizeReportAction,
  regenerateReportAction,
  requestReportRevisionAction,
  sendReportAction,
} from "@/server/actions/reports";
import { Alert, PageHeader, ReportStatusBadge } from "@/components/ui";
import { ATTENDANCE_LABEL, REPORT_TYPE_LABEL, dayName, formatDate, formatDateShort, formatDateTime } from "@/lib/format";
import { getReportForActor } from "@/server/services";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; ok?: string };
}) {
  const user = await requireUser();
  const actor = await currentActor();
  const report = actor ? await getReportForActor(prisma, actor, params.id) : null;
  if (!report) notFound();

  const isManager = user.role === "HRD" || user.role === "ADMIN";
  const isFinal = report.status === "FINAL";
  const verifyUrl = `${env.appUrl}/verify/${report.verificationToken}`;
  const qrSvg = await QRCode.toString(verifyUrl, { type: "svg", margin: 1, width: 150 });

  return (
    <div>
      <PageHeader
        title={`Laporan ${REPORT_TYPE_LABEL[report.type]}`}
        subtitle={`${report.number} • ${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}`}
        action={<ReportStatusBadge status={report.status} />}
      />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      <div className="card space-y-1.5 text-sm">
        <p className="text-base font-semibold text-slate-800">{report.student.user.name}</p>
        <p className="text-slate-500">
          NIS {report.student.nis} • {report.student.className ?? "-"}
        </p>
        <p className="text-slate-500">{report.student.school.name}</p>
        <p className="text-slate-500">{report.items.length} log disetujui</p>
        {report.note ? <p className="text-amber-700">Catatan: {report.note}</p> : null}
      </div>

      <div className="mt-4 flex gap-3">
        <a href={`/api/reports/${report.id}/pdf`} className="btn btn-secondary flex-1" target="_blank">
          Unduh PDF
        </a>
      </div>

      <div className="card mt-4 flex items-center gap-4">
        <div className="h-[110px] w-[110px] shrink-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="text-sm">
          <p className="font-semibold text-slate-800">Verifikasi Keaslian (QR)</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Pindai QR untuk membuka halaman verifikasi laporan.
          </p>
          <p className="mt-2 break-all text-xs text-brand-700">{verifyUrl}</p>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="section-title mb-2">Rincian Log Disetujui</h2>
        <div className="card divide-y divide-slate-100 p-0">
          {report.items.map((item) => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  {dayName(item.log.date)}, {formatDate(item.log.date)}
                </p>
                <span className="text-xs font-semibold text-slate-500">
                  {ATTENDANCE_LABEL[item.log.attendance]}
                </span>
              </div>
              {item.log.attendance === "HADIR" ? (
                <p className="mt-1 text-xs text-slate-500">
                  {item.log.checkIn}–{item.log.checkOut} • {item.log.activity}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">{item.log.reason}</p>
              )}
            </div>
          ))}
          {report.items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Belum ada log pada laporan ini.</p>
          ) : null}
        </div>
      </div>

      {isManager ? (
        <div className="mt-5 space-y-4">
          {!isFinal ? (
            <>
              <form action={finalizeReportAction} className="card">
                <input type="hidden" name="reportId" value={report.id} />
                <p className="mb-3 text-sm text-slate-600">Laporan layak? Finalkan agar dapat dikirim.</p>
                <button type="submit" className="btn btn-primary w-full">
                  Finalkan Laporan
                </button>
              </form>

              <form action={regenerateReportAction} className="card">
                <input type="hidden" name="reportId" value={report.id} />
                <p className="mb-3 text-sm text-slate-600">
                  Segarkan daftar log setelah siswa menambah/memperbaiki log yang disetujui.
                </p>
                <button type="submit" className="btn btn-secondary w-full">
                  Segarkan Log
                </button>
              </form>

              <form action={requestReportRevisionAction} className="card space-y-3">
                <input type="hidden" name="reportId" value={report.id} />
                <div>
                  <label className="label" htmlFor="note">
                    Belum layak? Minta revisi ke siswa
                  </label>
                  <textarea id="note" name="note" rows={2} required className="input" placeholder="Catatan revisi..." />
                </div>
                <button type="submit" className="btn btn-secondary w-full">
                  Minta Revisi
                </button>
              </form>
            </>
          ) : (
            <form action={sendReportAction} className="card space-y-3">
              <input type="hidden" name="reportId" value={report.id} />
              <p className="text-sm font-semibold text-slate-700">Kirim Laporan (tautan aman)</p>
              <div>
                <label className="label" htmlFor="recipientEmail">
                  Email Tujuan
                </label>
                <input
                  id="recipientEmail"
                  name="recipientEmail"
                  type="email"
                  required
                  className="input"
                  defaultValue={report.student.school.email ?? ""}
                  placeholder="hrd@sekolah.sch.id"
                />
              </div>
              <div>
                <label className="label" htmlFor="recipientType">
                  Jenis Penerima
                </label>
                <select id="recipientType" name="recipientType" className="input" defaultValue="SEKOLAH">
                  <option value="SEKOLAH">Sekolah</option>
                  <option value="HRD">HRD</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary w-full">
                Kirim via Email
              </button>
            </form>
          )}
        </div>
      ) : null}

      {isManager && report.sends.length > 0 ? (
        <div className="mt-5">
          <h2 className="section-title mb-2">Riwayat Pengiriman</h2>
          <ul className="space-y-2">
            {report.sends.map((send) => (
              <li key={send.id} className="card text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-700">{send.recipientEmail}</p>
                  <span className="text-xs font-semibold text-slate-500">{send.status}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {send.recipientType} • {formatDateTime(send.sentAt)} • berlaku s.d. {formatDateShort(send.expiresAt)}
                </p>
                {send.openedAt ? (
                  <p className="text-xs text-emerald-600">Dibuka {formatDateTime(send.openedAt)}</p>
                ) : (
                  <p className="text-xs text-slate-400">Belum dibuka</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
