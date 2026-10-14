import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/server/actions/auth";
import { AppNav } from "@/components/app-nav";
import { ROLE_LABEL } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              TH
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-slate-900">Daily Activity PKL</span>
              <span className="block text-xs text-slate-500">Trans Hybrid</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <span className="block text-sm font-medium text-slate-700">{user.name}</span>
              <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary btn-sm">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      <AppNav role={user.role} />
    </div>
  );
}
