import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, LogStatusBadge, ReportStatusBadge } from "@/components/ui";
import { ATTENDANCE_LABEL, formatDate, formatDateShort, formatDateTime } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser();

  return (
    <div>
      <Alert error={searchParams.error} />
      <div className="mb-4">
        <p className="text-sm text-slate-500">Selamat datang,</p>
        <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
        {user.schoolName ? <p className="text-sm text-slate-500">{user.schoolName}</p> : null}
        {user.divisionName ? <p className="text-sm text-slate-500">Divisi {user.divisionName}</p> : null}
      </div>

      {user.role === "SISWA" ? <StudentDashboard studentId={user.studentId!} /> : null}
      {user.role === "PEMBIMBING" ? <SupervisorDashboard supervisorId={user.supervisorId!} /> : null}
      {user.role === "HRD" || user.role === "ADMIN" ? <HrdDashboard /> : null}
    </div>
  );
}

function StatCard({ label, value, href, tone }: { label: string; value: number; href: string; tone: string }) {
  return (
    <Link href={href} className="card flex flex-col">
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className={`mt-1 text-xs font-semibold ${tone}`}>{label}</span>
    </Link>
  );
}

async function StudentDashboard({ studentId }: { studentId: string }) {
  const [draft, diajukan, disetujui, revisi, recent, today] = await Promise.all([
    prisma.dailyReport.count({ where: { studentId, status: "DRAFT" } }),
    prisma.dailyReport.count({ where: { studentId, status: "DIAJUKAN" } }),
    prisma.dailyReport.count({ where: { studentId, status: "DISETUJUI" } }),
    prisma.dailyReport.count({ where: { studentId, status: "REVISI" } }),
    prisma.dailyReport.findMany({ where: { studentId }, orderBy: { date: "desc" }, take: 5 }),
    prisma.dailyReport.findFirst({
      where: { studentId, date: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z") },
    }),
  ]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Draft" value={draft} href="/logs" tone="text-slate-500" />
        <StatCard label="Menunggu Persetujuan" value={diajukan} href="/logs" tone="text-amber-600" />
        <StatCard label="Disetujui" value={disetujui} href="/logs" tone="text-emerald-600" />
        <StatCard label="Perlu Revisi" value={revisi} href="/logs" tone="text-rose-600" />
      </div>

      <div className="mt-4">
        {today ? (
          <Link href={`/logs/${today.id}`} className="btn btn-secondary w-full">
            Lihat log hari ini ({LogInlineStatus(today.status)})
          </Link>
        ) : (
          <Link href="/logs/new" className="btn btn-primary w-full">
            Isi Log Hari Ini
          </Link>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">Log Terbaru</h2>
          <Link href="/logs" className="text-sm font-medium text-brand-700">
            Lihat semua
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="card text-sm text-slate-500">Belum ada log.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((log) => (
              <li key={log.id}>
                <Link href={`/logs/${log.id}`} className="card flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{formatDate(log.date)}</p>
                    <p className="text-xs text-slate-500">{ATTENDANCE_LABEL[log.attendance]}</p>
                  </div>
                  <LogStatusBadge status={log.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LogInlineStatus(status: string) {
  const map: Record<string, string> = {
    DRAFT: "draft",
    DIAJUKAN: "menunggu persetujuan",
    DISETUJUI: "disetujui",
    REVISI: "perlu revisi",
  };
  return map[status] ?? status;
}

async function SupervisorDashboard({ supervisorId }: { supervisorId: string }) {
  const [pending, students, reports, recentSubmissions] = await Promise.all([
    prisma.dailyReport.count({
      where: {
        status: "DIAJUKAN",
        placement: { is: { supervisorId } },
      },
    }),
    prisma.placement.findMany({
      where: { supervisorId, active: true },
      include: { student: { include: { user: true, school: true } }, division: true },
    }),
    prisma.report.count({
      where: { student: { placements: { some: { supervisorId } } } },
    }),
    prisma.dailyReport.findMany({
      where: {
        status: { in: ["DIAJUKAN", "DISETUJUI", "REVISI"] },
        placement: { is: { supervisorId } },
      },
      include: { student: { include: { user: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Menunggu Persetujuan" value={pending} href="/approvals" tone="text-amber-600" />
        <StatCard label="Siswa Bimbingan" value={students.length} href="/dashboard" tone="text-slate-500" />
        <StatCard label="Laporan" value={reports} href="/reports" tone="text-slate-500" />
      </div>

      <div className="mt-4">
        <Link href="/approvals" className="btn btn-primary w-full">
          Periksa Log Siswa
        </Link>
      </div>

      <div className="mt-6">
        <h2 className="section-title mb-2">Kiriman Log Siswa</h2>
        {recentSubmissions.length === 0 ? (
          <p className="card text-sm text-slate-500">Belum ada kiriman log dari siswa bimbingan.</p>
        ) : (
          <ul className="space-y-2">
            {recentSubmissions.map((log) => (
              <li key={log.id}>
                <Link href={`/approvals/${log.id}`} className="card block">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{log.student.user.name}</p>
                    <LogStatusBadge status={log.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(log.date)} • {ATTENDANCE_LABEL[log.attendance]}
                    {log.submittedAt ? ` • dikirim ${formatDateTime(log.submittedAt)}` : ""}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                    {log.activity ?? log.reason ?? "Data kegiatan tidak tersedia."}
                  </p>
                  {log.result ? <p className="mt-1 line-clamp-1 text-xs text-slate-500">Hasil: {log.result}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h2 className="section-title mb-2">Siswa Bimbingan</h2>
        {students.length === 0 ? (
          <p className="card text-sm text-slate-500">Belum ada siswa bimbingan.</p>
        ) : (
          <ul className="space-y-2">
            {students.map((p) => (
              <li key={p.id} className="card">
                <p className="text-sm font-medium text-slate-800">{p.student.user.name}</p>
                <p className="text-xs text-slate-500">
                  {p.student.school.name} • Divisi {p.division.name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function HrdDashboard() {
  const [students, pending, draftReports, finalReports, recentReports] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.dailyReport.count({ where: { status: "DIAJUKAN" } }),
    prisma.report.count({ where: { status: { in: ["DRAFT", "REVISI"] } } }),
    prisma.report.count({ where: { status: "FINAL" } }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { student: { include: { user: true } } },
    }),
  ]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Siswa PKL" value={students} href="/admin/placements" tone="text-slate-500" />
        <StatCard label="Log Menunggu" value={pending} href="/reports" tone="text-amber-600" />
        <StatCard label="Laporan Draft/Revisi" value={draftReports} href="/reports" tone="text-slate-500" />
        <StatCard label="Laporan Final" value={finalReports} href="/reports" tone="text-emerald-600" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/reports/new" className="btn btn-primary">
          Buat Laporan
        </Link>
        <Link href="/admin" className="btn btn-secondary">
          Kelola Data
        </Link>
      </div>

      <div className="mt-6">
        <h2 className="section-title mb-2">Laporan Terbaru</h2>
        {recentReports.length === 0 ? (
          <p className="card text-sm text-slate-500">Belum ada laporan.</p>
        ) : (
          <ul className="space-y-2">
            {recentReports.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="card flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.student.user.name}</p>
                    <p className="text-xs text-slate-500">
                      {r.number} • {formatDateShort(r.periodStart)}–{formatDateShort(r.periodEnd)}
                    </p>
                  </div>
                  <ReportStatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
