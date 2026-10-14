import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";

export default async function AdminHubPage() {
  await requireRole(["HRD", "ADMIN"]);
  const [schools, divisions, users, placements, audits] = await Promise.all([
    prisma.school.count(),
    prisma.division.count(),
    prisma.user.count(),
    prisma.placement.count({ where: { active: true } }),
    prisma.auditLog.count(),
  ]);

  const items = [
    { href: "/admin/schools", label: "Sekolah", value: schools },
    { href: "/admin/divisions", label: "Divisi", value: divisions },
    { href: "/admin/users", label: "Akun Pengguna", value: users },
    { href: "/admin/placements", label: "Penempatan Aktif", value: placements },
    { href: "/audit", label: "Jejak Audit", value: audits },
  ];

  return (
    <div>
      <PageHeader title="Kelola Data" subtitle="Sekolah, divisi, akun, penempatan, dan jejak audit." />
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="card">
            <span className="block text-2xl font-bold text-slate-900">{item.value}</span>
            <span className="mt-1 block text-sm font-medium text-brand-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
