import { prisma } from "@/lib/prisma";
import { getSendByToken } from "@/server/services";
import { REPORT_TYPE_LABEL, formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const result = await getSendByToken(prisma, params.token);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
          TH
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Laporan PKL Trans Hybrid</h1>
      </div>

      {!result ? (
        <div className="card border-rose-200 bg-rose-50 text-center text-rose-700">
          <p className="font-bold">Tautan tidak valid</p>
          <p className="mt-1 text-sm">Tautan tidak ditemukan atau sudah dicabut.</p>
        </div>
      ) : result.expired ? (
        <div className="card border-amber-200 bg-amber-50 text-center text-amber-700">
          <p className="font-bold">Tautan kedaluwarsa</p>
          <p className="mt-1 text-sm">
            Masa berlaku tautan berakhir pada {formatDateTime(result.send.expiresAt)}. Silakan minta tautan baru kepada HRD.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card space-y-2 text-sm">
            <p className="text-base font-semibold text-slate-800">{result.send.report.student.user.name}</p>
            <Row label="Nomor" value={result.send.report.number} />
            <Row label="Jenis" value={REPORT_TYPE_LABEL[result.send.report.type]} />
            <Row label="Sekolah" value={result.send.report.student.school.name} />
            <Row
              label="Periode"
              value={`${formatDate(result.send.report.periodStart)} – ${formatDate(result.send.report.periodEnd)}`}
            />
            <Row label="Status" value={result.send.report.status} />
            <Row label="Tautan berlaku s.d." value={formatDate(result.send.expiresAt)} />
          </div>

          <a
            href={`/api/reports/${result.send.reportId}/pdf?token=${result.send.token}`}
            className="btn btn-primary w-full"
            target="_blank"
          >
            Buka / Unduh PDF Laporan
          </a>

          <div className="card">
            <p className="mb-2 text-sm font-semibold text-slate-700">Rincian Log Disetujui</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {result.send.report.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>{formatDate(item.log.date)}</span>
                  <span>{item.log.attendance}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-xs text-slate-400">
            Tautan ini bersifat rahasia. Jangan bagikan kepada pihak yang tidak berkepentingan.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
