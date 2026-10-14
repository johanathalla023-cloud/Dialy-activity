"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const NAV: Record<string, NavItem[]> = {
  SISWA: [
    { href: "/dashboard", label: "Dasbor" },
    { href: "/logs", label: "Log Harian" },
    { href: "/reports", label: "Laporan" },
  ],
  PEMBIMBING: [
    { href: "/dashboard", label: "Dasbor" },
    { href: "/approvals", label: "Persetujuan" },
    { href: "/reports", label: "Laporan" },
  ],
  HRD: [
    { href: "/dashboard", label: "Dasbor" },
    { href: "/reports", label: "Laporan" },
    { href: "/admin", label: "Kelola" },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dasbor" },
    { href: "/reports", label: "Laporan" },
    { href: "/admin", label: "Kelola" },
  ],
};

export function AppNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = NAV[role] ?? NAV.SISWA;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                active ? "text-brand-700" : "text-slate-500"
              }`}
            >
              <span
                className={`mx-auto mb-1 block h-1 w-8 rounded-full ${
                  active ? "bg-brand-600" : "bg-transparent"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
