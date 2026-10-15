import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, LogStatusBadge, PageHeader } from "@/components/ui";
import { approveLogAction, requestRevisionAction } from "@/server/actions/logs";
import { ATTENDANCE_LABEL, dayName, formatDate, formatDateTime } from "@/lib/format";

export default async function ApprovalDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await requireRole(["PEMBIMBING", "ADMIN"]);
  const log = await prisma.dailyReport.findUnique({
    where: { id: params.id },
    include: { student: { include: { user: true, school: true } } },
  });
  if (!log) notFound();

  if (user.role === "PEMBIMBING") {
    const owns = log.placementId
      ? await prisma.placement.findFirst({
          where: { id: log.placementId, supervisorId: user.supervisorId! },
        })
      : null;
    if (!owns) notFound();
  }

  const [photo, proof] = await Promise.all([
    log.photoId ? prisma.fileAsset.findUnique({ where: { id: log.photoId } }) : null,
    log.proofId ? prisma.fileAsset.findUnique({ where: { id: log.proofId } }) : null,
  ]);

  return (
    <div>
      <PageHeader
        title={log.student.user.name}
        subtitle={`${dayName(log.date)}, ${formatDate(log.date)} • ${ATTENDANCE_LABEL[log.attendance]}`}
        action={<LogStatusBadge status={log.status} />}
      />
      <Alert error={searchParams.error} />

      <div className="card space-y-3">
        {log.attendance === "HADIR" ? (
          <>
            <Row label="Jam">{log.checkIn}–{log.checkOut}</Row>
            <Row label="Kegiatan">{log.activity}</Row>
            <Row label="Hasil">{log.result || "-"}</Row>
            <Row label="Kendala">{log.obstacle || "-"}</Row>
            {photo ? (
              <Row label="Foto">
                <a href={`/api/files/${photo.id}`} target="_blank" className="text-brand-700 underline">
                  {photo.filename}
                </a>
              </Row>
            ) : null}
          </>
        ) : (
          <>
            <Row label="Alasan">{log.reason}</Row>
            {proof ? (
              <Row label="Bukti">
                <a href={`/api/files/${proof.id}`} target="_blank" className="text-brand-700 underline">
                  {proof.filename}
                </a>
              </Row>
            ) : null}
          </>
        )}
        <Row label="Diajukan">{log.submittedAt ? formatDateTime(log.submittedAt) : "-"}</Row>
      </div>

      {/* Tombol Cetak PDF */}
      <div className="mt-4">
        <a
          href={`/api/logs/${log.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary w-full"
        >
          Cetak PDF Log Ini
        </a>
      </div>

      {log.status === "DIAJUKAN" ? (
        <div className="mt-4 space-y-4">
          <form action={approveLogAction} className="card space-y-3">
            <input type="hidden" name="logId" value={log.id} />
            <div>
              <label className="label" htmlFor="note-approve">
                Catatan (opsional)
              </label>
              <textarea id="note-approve" name="note" rows={2} className="input" placeholder="Catatan persetujuan..." />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Setujui &amp; Kunci Log
            </button>
          </form>

          <form action={requestRevisionAction} className="card space-y-3">
            <input type="hidden" name="logId" value={log.id} />
            <div>
              <label className="label" htmlFor="note-revise">
                Catatan Revisi (wajib)
              </label>
              <textarea
                id="note-revise"
                name="note"
                rows={2}
                required
                className="input"
                placeholder="Contoh: mohon lengkapi uraian hasil kegiatan."
              />
            </div>
            <button type="submit" className="btn btn-secondary w-full">
              Minta Revisi
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Log ini tidak lagi menunggu pemeriksaan.</p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <p className="text-sm text-slate-800">{children}</p>
    </div>
  );
}
