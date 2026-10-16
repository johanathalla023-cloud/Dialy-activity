import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPlacementAction } from "@/server/actions/admin";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { formatDate, todayInput } from "@/lib/format";

export default async function PlacementsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  await requireRole(["HRD", "ADMIN"]);
  const [students, supervisors, divisions, placements] = await Promise.all([
    prisma.studentProfile.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.supervisorProfile.findMany({ include: { user: true, division: true }, orderBy: { user: { name: "asc" } } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.placement.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { student: { include: { user: true } }, supervisor: { include: { user: true } }, division: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Penempatan Siswa" subtitle="Tetapkan siswa ke pembimbing dan divisi." />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      <form action={createPlacementAction} className="card space-y-3">
        <p className="text-sm font-semibold text-slate-700">Penempatan Baru</p>
        <select name="studentId" className="input" required defaultValue="">
          <option value="" disabled>
            Pilih siswa
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.user.name} ({s.nis})
            </option>
          ))}
        </select>
        <select name="supervisorId" className="input" required defaultValue="">
          <option value="" disabled>
            Pilih pembimbing
          </option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.user.name} — {s.division.name}
            </option>
          ))}
        </select>
        <select name="divisionId" className="input" required defaultValue="">
          <option value="" disabled>
            Pilih divisi
          </option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Mulai</label>
            <input name="startDate" type="date" className="input" defaultValue={todayInput()} required />
          </div>
          <div>
            <label className="label">Selesai (opsional)</label>
            <input name="endDate" type="date" className="input" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Simpan Penempatan
        </button>
      </form>

      <h2 className="section-title mb-2 mt-5">Riwayat Penempatan</h2>
      <ul className="space-y-2">
        {placements.map((p) => (
          <li key={p.id} className="card flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{p.student.user.name}</p>
              <p className="text-xs text-slate-500">
                Pembimbing: {p.supervisor.user.name} • {p.division.name}
              </p>
              <p className="text-xs text-slate-400">
                {formatDate(p.startDate)} – {p.endDate ? formatDate(p.endDate) : "sekarang"}
              </p>
            </div>
            <Badge tone={p.active ? "emerald" : "slate"}>{p.active ? "Aktif" : "Berakhir"}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
