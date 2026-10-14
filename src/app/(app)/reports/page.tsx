import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentActor } from "@/lib/actor";
import { Alert, EmptyState, PageHeader, ReportStatusBadge } from "@/components/ui";
import { REPORT_TYPE_LABEL, formatDateShort } from "@/lib/format";
import { listReportsForActor } from "@/server/services";

export default async function ReportsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const user = await requireUser();
  const actor = await currentActor();
  const reports = actor ? await listReportsForActor(prisma, actor) : [];
  const isManager = user.role === "HRD" || user.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle="Laporan dibuat hanya dari log yang sudah disetujui."
        action={
          isManager ? (
            <Link href="/reports/new" className="btn btn-primary btn-sm">
              Buat
            </Link>
          ) : undefined
        }
      />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      {reports.length === 0 ? (
        <EmptyState title="Belum ada laporan" hint={isManager ? "Buat laporan dari log yang disetujui." : undefined} />
      ) : (
        <ul className="space-y-2">
          {reports.map((report) => (
            <li key={report.id}>
              <Link href={`/reports/${report.id}`} className="card block">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{report.student.user.name}</p>
                  <ReportStatusBadge status={report.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {report.number} • {REPORT_TYPE_LABEL[report.type]} •{" "}
                  {formatDateShort(report.periodStart)}–{formatDateShort(report.periodEnd)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
