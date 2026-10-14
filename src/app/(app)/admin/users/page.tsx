import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUserAction, toggleUserActiveAction } from "@/server/actions/admin";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/format";

export default async function UsersPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const user = await requireRole(["HRD", "ADMIN"]);
  const [users, schools, divisions] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { studentProfile: { include: { school: true } }, supervisorProfile: { include: { division: true } } },
    }),
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
  ]);

  const canCreateHrd = user.role === "ADMIN";

  return (
    <div>
      <PageHeader title="Akun Pengguna" subtitle="Buat dan kelola akun siswa/pembimbing." />
      <Alert error={searchParams.error} ok={searchParams.ok} />

      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
                <p className="text-xs text-slate-500">
                  {u.studentProfile ? `${u.studentProfile.school.name} • NIS ${u.studentProfile.nis}` : null}
                  {u.supervisorProfile ? `Divisi ${u.supervisorProfile.division.name}` : null}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge tone={u.active ? "emerald" : "slate"}>{ROLE_LABEL[u.role]}</Badge>
                <form action={toggleUserActiveAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button type="submit" className="btn btn-secondary btn-sm">
                    {u.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form action={createUserAction} className="card mt-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Tambah Akun</p>
        <div className="grid grid-cols-2 gap-3">
          <input name="name" className="input" placeholder="Nama lengkap" required />
          <input name="email" type="email" className="input" placeholder="Email" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select name="role" className="input" defaultValue="SISWA">
            <option value="SISWA">Siswa</option>
            <option value="PEMBIMBING">Pembimbing</option>
            {canCreateHrd ? <option value="HRD">HRD</option> : null}
          </select>
          <input name="password" type="text" className="input" placeholder="Kata sandi (min 6)" required />
        </div>

        <fieldset className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-xs font-semibold text-slate-500">Untuk Siswa</legend>
          <div className="grid grid-cols-2 gap-3">
            <input name="nis" className="input" placeholder="NIS" />
            <input name="className" className="input" placeholder="Kelas" />
          </div>
          <select name="schoolId" className="input mt-3" defaultValue="">
            <option value="">Pilih sekolah</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-xs font-semibold text-slate-500">Untuk Pembimbing</legend>
          <input name="nip" className="input" placeholder="NIP (opsional)" />
          <select name="divisionId" className="input mt-3" defaultValue="">
            <option value="">Pilih divisi</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </fieldset>

        <button type="submit" className="btn btn-primary w-full">
          Buat Akun
        </button>
      </form>
    </div>
  );
}
