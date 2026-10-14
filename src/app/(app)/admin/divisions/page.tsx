import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDivisionAction } from "@/server/actions/admin";
import { Alert, PageHeader } from "@/components/ui";

export default async function DivisionsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  await requireRole(["HRD", "ADMIN"]);
  const divisions = await prisma.division.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { supervisors: true, placements: true } } },
  });

  return (
    <div>
      <PageHeader title="Divisi" subtitle="Divisi di Trans Hybrid." />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      <ul className="space-y-2">
        {divisions.map((d) => (
          <li key={d.id} className="card">
            <p className="text-sm font-semibold text-slate-800">{d.name}</p>
            <p className="text-xs text-slate-500">
              {d.description ?? "-"} • {d._count.supervisors} pembimbing
            </p>
          </li>
        ))}
      </ul>

      <form action={createDivisionAction} className="card mt-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Tambah Divisi</p>
        <input name="name" className="input" placeholder="Nama divisi" required />
        <input name="description" className="input" placeholder="Deskripsi singkat" />
        <button type="submit" className="btn btn-primary w-full">
          Simpan
        </button>
      </form>
    </div>
  );
}
