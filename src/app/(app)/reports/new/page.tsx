import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReportAction } from "@/server/actions/reports";
import { Alert, PageHeader } from "@/components/ui";
import { formatDateInput, todayDate } from "@/lib/format";

function daysAgo(n: number): string {
  const d = todayDate();
  d.setUTCDate(d.getUTCDate() - n);
  return formatDateInput(d);
}

export default async function NewReportPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireRole(["HRD", "ADMIN"]);
  const students = await prisma.studentProfile.findMany({
    include: { user: true, school: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <PageHeader title="Buat Laporan" subtitle="Pilih siswa, jenis, dan periode laporan." />
      <Alert error={searchParams.error} />

      <form action={createReportAction} className="card space-y-4">
        <div>
          <label className="label" htmlFor="studentId">
            Siswa
          </label>
          <select id="studentId" name="studentId" className="input" required defaultValue="">
            <option value="" disabled>
              Pilih siswa
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.name} — {s.school.name} ({s.nis})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="type">
            Jenis Laporan
          </label>
          <select id="type" name="type" className="input" defaultValue="MINGGUAN">
            <option value="MINGGUAN">Mingguan</option>
            <option value="BULANAN">Bulanan</option>
            <option value="AKHIR">Akhir</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="periodStart">
              Dari Tanggal
            </label>
            <input id="periodStart" name="periodStart" type="date" defaultValue={daysAgo(7)} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="periodEnd">
              Sampai Tanggal
            </label>
            <input id="periodEnd" name="periodEnd" type="date" defaultValue={daysAgo(1)} className="input" required />
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full">
          Buat Laporan
        </button>
        <p className="text-xs text-slate-400">
          Hanya log berstatus Disetujui pada periode ini yang akan dimasukkan.
        </p>
      </form>
    </div>
  );
}
