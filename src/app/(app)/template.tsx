/**
 * Template untuk area terautentikasi: di-remount pada setiap perpindahan halaman
 * sehingga konten baru masuk dengan animasi halus (lihat `.page-enter` di globals.css).
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
