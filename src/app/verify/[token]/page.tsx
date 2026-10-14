import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyReport } from "@/server/services";
import { REPORT_TYPE_LABEL, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: { token: string } }) {
  const result = await verifyReport(prisma, params.token);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
          TH
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Verifikasi Laporan PKL</h1>
        <p className="text-sm text-slate-500">Trans Hybrid</p>
      </div>

      {!result.found ? (
        <div className="card border-rose-200 bg-rose-50 text-center">
          <p className="text-lg font-bold text-rose-700">Tidak Terverifikasi</p>
          <p className="mt-1 text-sm text-rose-600">
            Token verifikasi tidak ditemukan. Laporan ini tidak dapat dipastikan keasliannya.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={`card text-center ${
              result.report.status === "FINAL"
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p
              className={`text-lg font-bold ${
                result.report.status === "FINAL" ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {result.report.status === "FINAL" ? "Laporan ASLI & Final" : "Laporan Belum Final"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Diterbitkan oleh Trans Hybrid
              {result.report.finalizedAt ? ` pada ${formatDate(result.report.finalizedAt)}` : ""}.
            </p>
          </div>

          <div className="card space-y-2 text-sm">
            <Row label="Nomor Laporan" value={result.report.number} />
            <Row label="Jenis" value={REPORT_TYPE_LABEL[result.report.type]} />
            <Row label="Siswa" value={result.report.student.user.name} />
            <Row label="NIS" value={result.report.student.nis} />
            <Row label="Sekolah" value={result.report.student.school.name} />
            <Row
              label="Periode"
              value={`${formatDate(result.report.periodStart)} – ${formatDate(result.report.periodEnd)}`}
            />
            <Row label="Jumlah Log" value={`${result.report.items.length} log disetujui`} />
          </div>

          <div className="card">
            <p className="mb-2 text-sm font-semibold text-slate-700">Rincian Log</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {result.report.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>{formatDate(item.log.date)}</span>
                  <span>{item.log.attendance}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm font-medium text-brand-700">
          Masuk ke aplikasi
        </Link>
      </div>
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
