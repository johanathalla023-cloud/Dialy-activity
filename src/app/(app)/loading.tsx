/**
 * Fallback navigasi untuk seluruh area terautentikasi.
 * Muncul seketika saat berpindah halaman (sebelum data server selesai dimuat),
 * sehingga klik terasa langsung merespons alih-alih "menggantung".
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <span className="text-sm font-medium text-slate-400">Memuat halaman…</span>
      </div>

      <div className="animate-pulse space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-6 w-40 rounded-lg bg-slate-200" />
            <div className="h-4 w-56 rounded bg-slate-100" />
          </div>
          <div className="h-8 w-16 rounded-lg bg-slate-100" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100" />
          ))}
        </div>

        <div className="h-11 rounded-xl bg-slate-100" />

        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
