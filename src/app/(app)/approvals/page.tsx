import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { ATTENDANCE_LABEL, formatDate, formatDateTime } from "@/lib/format";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  const user = await requireRole(["PEMBIMBING", "ADMIN"]);

  const pending = user.supervisorId
    ? await prisma.dailyReport.findMany({
        where: {
          status: "DIAJUKAN",
          placement: { is: { supervisorId: user.supervisorId } },
        },
        include: { student: { include: { user: true, school: true } } },
        orderBy: { submittedAt: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader title="Persetujuan Log" subtitle="Periksa log siswa lalu setujui atau minta revisi." />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      {pending.length === 0 ? (
        <EmptyState title="Tidak ada log menunggu" hint="Semua log bimbingan sudah diperiksa." />
      ) : (
        <ul className="space-y-2">
          {pending.map((log) => (
            <li key={log.id}>
              <Link href={`/approvals/${log.id}`} className="card block">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{log.student.user.name}</p>
                  <span className="text-xs text-slate-400">{formatDate(log.date)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {ATTENDANCE_LABEL[log.attendance]} • diajukan {log.submittedAt ? formatDateTime(log.submittedAt) : "-"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
