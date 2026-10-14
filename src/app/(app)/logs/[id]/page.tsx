import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogForm } from "@/components/log-form";
import { Alert, LogStatusBadge, PageHeader } from "@/components/ui";
import { ATTENDANCE_LABEL, dayName, formatDate, formatDateTime } from "@/lib/format";

export default async function LogDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; ok?: string };
}) {
  const user = await requireRole(["SISWA"]);
  const log = await prisma.dailyReport.findFirst({
    where: { id: params.id, studentId: user.studentId! },
  });
  if (!log) notFound();

  const audit = await prisma.auditLog.findMany({
    where: { entityType: "DailyReport", entityId: log.id },
    orderBy: { createdAt: "asc" },
  });

  const editable = log.status === "DRAFT" || log.status === "REVISI";

  async function attachment(id: string | null) {
    if (!id) return null;
    return prisma.fileAsset.findUnique({ where: { id } });
  }
  const [photo, proof] = await Promise.all([attachment(log.photoId), attachment(log.proofId)]);

  return (
    <div>
      <PageHeader
        title={`${dayName(log.date)}, ${formatDate(log.date)}`}
        subtitle={ATTENDANCE_LABEL[log.attendance]}
        action={<LogStatusBadge status={log.status} />}
      />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      {log.status === "REVISI" && log.supervisorNote ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>Catatan pembimbing:</b> {log.supervisorNote}
        </div>
      ) : null}

      {log.status === "DISETUJUI" ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Log ini sudah disetujui dan terkunci sehingga tidak dapat diubah.
        </div>
      ) : null}

      {editable ? (
        <div className="card">
          <LogForm
            values={{
              id: log.id,
              date: log.date.toISOString().slice(0, 10),
              attendance: log.attendance,
              checkIn: log.checkIn,
              checkOut: log.checkOut,
              activity: log.activity,
              result: log.result,
              obstacle: log.obstacle,
              photoId: log.photoId,
              photoName: photo?.filename ?? null,
              reason: log.reason,
              proofId: log.proofId,
              proofName: proof?.filename ?? null,
            }}
          />
        </div>
      ) : (
        <div className="card space-y-3">
          {log.attendance === "HADIR" ? (
            <>
              <Row label="Jam">
                {log.checkIn}–{log.checkOut}
              </Row>
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
        </div>
      )}

      {audit.length > 0 ? (
        <div className="mt-5">
          <h2 className="section-title mb-2">Riwayat Status</h2>
          <ul className="space-y-2">
            {audit.map((a) => (
              <li key={a.id} className="card flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{a.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">
                    {a.actorName ?? "Sistem"}
                    {a.fromStatus ? ` • ${a.fromStatus} → ${a.toStatus}` : ""}
                  </p>
                  {a.note ? <p className="text-xs text-slate-500">{a.note}</p> : null}
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <Link href="/logs" className="btn btn-secondary w-full">
          Kembali ke daftar log
        </Link>
      </div>
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
