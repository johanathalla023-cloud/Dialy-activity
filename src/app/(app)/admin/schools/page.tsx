import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolAction } from "@/server/actions/admin";
import { Alert, PageHeader } from "@/components/ui";

export default async function SchoolsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  await requireRole(["HRD", "ADMIN"]);
  const schools = await prisma.school.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });

  return (
    <div>
      <PageHeader title="Sekolah" subtitle="Daftar sekolah mitra PKL." />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      <ul className="space-y-2">
        {schools.map((s) => (
          <li key={s.id} className="card">
            <p className="text-sm font-semibold text-slate-800">{s.name}</p>
            <p className="text-xs text-slate-500">
              {s.city ?? "-"} • {s._count.students} siswa
              {s.email ? ` • ${s.email}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <form action={createSchoolAction} className="card mt-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Tambah Sekolah</p>
        <input name="name" className="input" placeholder="Nama sekolah" required />
        <div className="grid grid-cols-2 gap-3">
          <input name="city" className="input" placeholder="Kota" />
          <input name="principalName" className="input" placeholder="Kepala sekolah" />
        </div>
        <input name="email" type="email" className="input" placeholder="Email sekolah" />
        <input name="address" className="input" placeholder="Alamat" />
        <button type="submit" className="btn btn-primary w-full">
          Simpan
        </button>
      </form>
    </div>
  );
}
