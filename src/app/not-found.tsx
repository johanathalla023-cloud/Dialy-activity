import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="mt-3 text-lg font-semibold text-slate-800">Halaman tidak ditemukan</h1>
      <p className="mt-1 text-sm text-slate-500">
        Data yang Anda cari tidak tersedia atau Anda tidak memiliki akses.
      </p>
      <Link href="/dashboard" className="btn btn-primary mt-5">
        Kembali ke Dasbor
      </Link>
    </div>
  );
}
