import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, EmptyState, LogStatusBadge, PageHeader } from "@/components/ui";
import { ATTENDANCE_LABEL, dayName, formatDate } from "@/lib/format";

export default async function LogsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const user = await requireRole(["SISWA"]);
  const logs = await prisma.dailyReport.findMany({
    where: { studentId: user.studentId! },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Log Harian"
        subtitle="Satu log per tanggal. Log yang sudah disetujui terkunci."
        action={
          <Link href="/logs/new" className="btn btn-primary btn-sm">
            Isi Log
          </Link>
        }
      />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      {logs.length === 0 ? (
        <EmptyState title="Belum ada log" hint="Mulai isi log kegiatan PKL hari ini." />
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id}>
              <Link href={`/logs/${log.id}`} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {dayName(log.date)}, {formatDate(log.date)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ATTENDANCE_LABEL[log.attendance]}
                    {log.attendance === "HADIR" && log.checkIn ? ` • ${log.checkIn}–${log.checkOut}` : ""}
                  </p>
                </div>
                <LogStatusBadge status={log.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
