# Daily Activity PKL — Trans Hybrid

Aplikasi web untuk mencatat kegiatan harian PKL, persetujuan pembimbing industri, serta
penerbitan laporan resmi (PDF bernomor + QR verifikasi) dan pengiriman tautan aman via email.

Dibangun dengan **Next.js 14 (App Router) + TypeScript**, **PostgreSQL (Supabase) + Prisma**,
dan **Tailwind CSS**. Antarmuka mobile-first dan berbahasa Indonesia.

---

## 1. Cara Menjalankan

Database sepenuhnya di **Supabase** — Docker tidak diperlukan.

### A. Siapkan Supabase

1. Buat project di [Supabase](https://supabase.com/), lalu buka **Connect** (atau
   **Project Settings → Database**).
2. Catat host pooler, user (`postgres.<project-ref>`), dan password. Aplikasi memakai dua koneksi:
   - **Transaction Pooler (port `6543`)** → `DATABASE_URL`, wajib ditambah
     `?pgbouncer=true&connection_limit=1`.
   - **Session Pooler (port `5432`)** → `DIRECT_URL`, dipakai `prisma migrate deploy`.

### B. Isi environment

```bash
copy .env.example .env
```

Buka `.env`, ganti `<project-ref>`, `<region>`, dan `<password>` dengan nilai Supabase, lalu
ganti `AUTH_SECRET` dengan string acak minimal 32 karakter.

### C. Migrasi lalu jalankan

```bash
npm install
npm run db:migrate        # terapkan skema ke Supabase
npm run db:seed           # opsional: buat akun demo (jangan di produksi)
npm run dev               # http://localhost:3000
```

Aplikasi berjalan di http://localhost:3000. Daftar akun demo ada di bagian 2.

> Catatan: `npm run dev` otomatis menghapus folder `.next` terlebih dahulu (script `predev`).
> Ini mencegah error runtime seperti `TypeError: __webpack_require__.n is not a function`.

## Deploy ke Vercel dengan Supabase

Supabase menyediakan PostgreSQL terkelola. Aplikasi menggunakan database PostgreSQL Supabase melalui Prisma;
URL koneksinya ditambahkan pada Vercel, bukan disimpan di Git.

1. Buat project di [Supabase](https://supabase.com/) dan buka **Connect** (atau
   **Project Settings → Database**). Untuk deployment Vercel/serverless, salin:
   - **Transaction Pooler** (port `6543`) untuk `DATABASE_URL`, wajib ditambah
     `?pgbouncer=true&connection_limit=1` pada query string.
   - **Session Pooler** (port `5432`) untuk `DIRECT_URL`, dipakai Prisma saat menjalankan migrasi.
     Di Prisma 5, `directUrl` memakai URL ini untuk migrasi.
2. Impor repository GitHub `johanathalla023-cloud/Dialy-activity` ke Vercel.
3. Di **Project Settings → Environment Variables**, tambahkan `DATABASE_URL`, `DIRECT_URL`,
   `AUTH_SECRET` (secret acak yang kuat, minimal 32 karakter), dan `APP_URL` dengan URL deployment
   Vercel, misalnya `https://nama-aplikasi.vercel.app`. Atur juga `LINK_EXPIRY_DAYS=7` jika diperlukan.
   Pastikan dicentang untuk environment **Production** dan **Preview**, lalu **Redeploy** agar
   nilai baru terpakai (env var yang ditambahkan setelah build tidak masuk ke build lama).
4. Gunakan `npm run vercel-build` sebagai Build Command. Perintah ini menjalankan migrasi Prisma lalu
   build Next.js. Prisma memakai `DIRECT_URL` untuk migrasi dan `DATABASE_URL` untuk koneksi aplikasi.
5. Deploy aplikasi. Untuk perubahan skema berikutnya, tambahkan migration Prisma ke GitHub; proses
   build Vercel akan menjalankan migrasi sebelum build.

Jangan menjalankan `npm run db:seed` pada database produksi: perintah itu menyiapkan akun-akun demo.
Untuk testing, gunakan project/branch Supabase terpisah dari data produksi. Jangan membagikan
connection string atau `AUTH_SECRET` di chat maupun repository.

---

## 2. Akun Demo

Semua akun memakai kata sandi yang sama: **`Password123!`**

| Peran | Email |
|---|---|
| HRD | `hrd@transhybrid.test` |
| Pembimbing Industri 1 (Divisi Operasional) | `pembimbing1@transhybrid.test` |
| Pembimbing Industri 2 (Divisi Teknologi) | `pembimbing2@transhybrid.test` |
| Siswa 1 — Andi Pratama | `siswa1@transhybrid.test` |
| Siswa 2 — Bunga Lestari | `siswa2@transhybrid.test` |
| Siswa 3 — Citra Dewi | `siswa3@transhybrid.test` |
| Siswa 4 — Dimas Saputra | `siswa4@transhybrid.test` |
| Siswa 5 — Eka Wijaya | `siswa5@transhybrid.test` |
| Admin | `admin@transhybrid.test` |

Siswa 1–3 dibimbing Pembimbing 1; siswa 4–5 dibimbing Pembimbing 2. Data sekolah dan divisi sudah
terisi (SMK Negeri 1 Jakarta, SMK Teknologi Nusantara; Divisi Operasional/Teknologi/Marketing).

Log siswa dan laporan awalnya kosong. Seed menyiapkan akun demo dan membersihkan log/laporan contoh
lama tanpa menghapus log baru yang dibuat dari aplikasi.

> Guru/sekolah **tidak perlu login**. Mereka hanya menerima tautan aman pada email dan dapat langsung
> membaca/mengunduh PDF selama masa berlaku tautan.

---

## 3. Alur Aplikasi

1. **HRD** membuat akun, sekolah, divisi, dan menempatkan siswa ke pembimbing (`Kelola` → Sekolah /
   Divisi / Akun / Penempatan).
2. **Siswa** mengisi log harian dengan status **Hadir / Izin / Sakit**.
   - Hadir: jam masuk, jam keluar, kegiatan, hasil, kendala, foto.
   - Izin/Sakit: alasan + bukti.
   - Log dapat **Disimpan sebagai Draft** lalu **Diajukan**.
3. **Pembimbing** menyetujui log (log terkunci) atau meminta revisi beserta catatan. Siswa
   memperbaiki dan mengajukan ulang.
4. **HRD** membuat laporan (Mingguan/Bulanan/Akhir) **hanya dari log yang disetujui**, lalu mengekspor
   **PDF bernomor** dengan **QR verifikasi**.
5. **HRD** memeriksa: layak → **Finalkan**; belum layak → **Minta Revisi** ke siswa.
6. **HRD** mengirim laporan final ke HRD/sekolah lewat **email berisi tautan aman** (memiliki masa
   berlaku). Riwayat pengiriman tercatat (status, waktu kirim, waktu dibuka).
7. **Scan QR** membuka halaman verifikasi keaslian laporan (`/verify/<token>`).

---

## 4. Aturan Bisnis yang Ditegakkan

| Aturan | Implementasi |
|---|---|
| 1 log per siswa per tanggal | `@@unique([studentId, date])` + validasi service (`saveStudentLog`) |
| Log disetujui tidak dapat diubah | `saveStudentLog` menolak status `DISETUJUI` (`LOG_TERKUNCI`) |
| Log yang sedang diajukan tidak diubah | menolak status `DIAJUKAN` (`LOG_MENUNGGU_REVIEW`) |
| Data dibatasi per peran | Siswa hanya data sendiri; pembimbing hanya siswa bimbingan; laporan & log difilter di service/route |
| Perubahan status tercatat | Setiap transisi menulis ke `AuditLog` (`LOG_DIAJUKAN`, `LOG_DISETUJUI`, `LAPORAN_DIFINALKAN`, dst.) |
| Laporan hanya dari log disetujui | `createReport` mensyaratkan minimal 1 log `DISETUJUI` pada periode (`TIDAK_ADA_LOG_DISETUJUI`) |
| Hanya laporan final yang bisa dikirim | `sendReport` menolak status selain `FINAL` (`LAPORAN_BELUM_FINAL`) |
| Laporan final tidak dapat direvisi | `requestReportRevision` menolak status `FINAL` (`SUDAH_FINAL`) |
| Tautan email punya masa berlaku | `ReportSend.expiresAt` (default 7 hari, lihat `LINK_EXPIRY_DAYS`) |

---

## 5. Peran & Hak Akses

- **Siswa** — mengisi/mengubah log (draft & revisi), mengajukan, melihat log & laporan sendiri.
- **Pembimbing Industri** — memeriksa log siswa bimbingan (setujui / minta revisi), melihat laporan
  bimbingannya.
- **HRD** — mengelola sekolah/divisi/akun/penempatan, membuat & memfinalkan laporan, mengirim email.
- **Admin** — sama seperti HRD, plus dapat membuat akun HRD.
- **Guru/Sekolah** — tanpa login; menerima tautan aman via email (punya masa berlaku) dan halaman
  verifikasi QR.

---

## 6. Struktur Proyek

```
prisma/
  schema.prisma        # model & enum
  migrations/          # migrasi PostgreSQL
  seed.ts              # data demo (1 HRD, 2 pembimbing, 5 siswa, dst.)
src/
  app/
    (app)/             # area terautentikasi (dashboard, logs, approvals, reports, admin, audit)
    login/             # halaman masuk
    verify/[token]/    # halaman verifikasi publik (scan QR)
    invite/[token]/    # halaman tautan aman publik (email)
    api/               # upload, files, PDF
  server/
    services/          # logika bisnis + audit (dipakai UI & test)
    actions/           # Server Actions (form)
    pdf.ts             # generate PDF + QR
  lib/                 # auth (JWT cookie), prisma, format, password
  components/          # UI + form log + navigasi
tests/                 # pengujian aturan bisnis (Vitest)
```

---

## 7. Pengujian

Tes menegakkan aturan bisnis di atas (1 log/tanggal, log terkunci, pembatasan peran, audit, laporan
hanya dari log disetujui, kirim hanya laporan final, masa berlaku tautan, verifikasi QR).

Prasyarat: PostgreSQL yang dapat diakses (lokal atau Supabase). Untuk Supabase, set
`TEST_DATABASE_URL` ke koneksi database uji (jangan pakai database produksi).

```bash
npm install
npm test
```

Tes otomatis membuat/menghapus database uji `pkl_test` (lihat `TEST_DATABASE_URL`, default
`postgresql://pkl:pkl@localhost:5432/pkl_test`). Bila port/host berbeda, set variabel tersebut.

Hasil saat ini: **15 tes lulus**.

---

## 8. Variabel Lingkungan

Lihat `.env.example`. Yang penting:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL |
| `AUTH_SECRET` | Kunci penandatangan sesi (JWT) — ganti di produksi |
| `APP_URL` | URL publik untuk tautan QR & email |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` | SMTP email. Bila `SMTP_HOST` kosong, email hanya dicatat ke tabel `EmailOutbox` (tidak benar-benar terkirim) |
| `LINK_EXPIRY_DAYS` | Masa berlaku tautan aman (hari) |

Bila `SMTP_HOST` dikosongkan, email tidak benar-benar terkirim dan hanya dicatat ke tabel `EmailOutbox`,
sehingga aplikasi tetap bisa diuji tanpa server SMTP.

---

## 9. Asumsi yang Diambil (karena tidak disebutkan eksplisit)

1. **Autentikasi sederhana** memakai email + kata sandi (hash bcrypt) dan sesi JWT di cookie
   httpOnly. Belum ada fitur reset kata sandi, 2FA, atau SSO.
2. **Guru/sekolah tanpa login** — cukup membuka tautan aman (token acak) dari email; tautan punya
   masa berlaku (default 7 hari) dan setiap pembukaan dicatat (`openedAt`).
3. **Perusahaan** diasumsikan tunggal: Trans Hybrid. Divisi berada di bawah perusahaan.
4. **Nomor laporan** berformat `NNN/TH-PKL/<JENIS>/<BULAN_ROMAWI>/<TAHUN>` (contoh
   `001/TH-PKL/MGG/X/2026`), dihitung urut per tahun.
5. **Minta revisi laporan ke siswa** berarti menandai laporan `REVISI` + catatan; siswa kemudian
   dapat menambah/memperbaiki log (log yang sudah disetujui tetap terkunci) dan HRD menyegarkan
   laporan (`Segarkan Log`) sebelum final.
6. **Lampiran (foto/bukti)** disimpan di database sebagai base64 (`FileAsset`, maks 5 MB) dan
   disajikan via `/api/files/[id]` — menghindari ketergantungan penyimpanan berkas eksternal.
7. **PDF** dihasilkan di sisi server dengan `pdfkit`; QR memakai pustaka `qrcode`. Format tanggal
   memakai UTC.
8. **Zona waktu** aplikasi diseragamkan ke UTC untuk kolom tanggal (`@db.Date`) dan validasi
   “tidak boleh tanggal masa depan”.
9. **Alamat email pengirim** default `no-reply@transhybrid.test` (domain contoh).
10. Versi `next@14.2.35` dipakai (rilis 14.2.x terbaru yang sudah ditambal). Untuk jangka panjang
    disarankan bermigrasi ke Next.js 15+.

---

## 10. Perintah Berguna

```bash
npm run dev            # mode pengembangan
npm run build          # build produksi
npm run start          # jalankan hasil build
npm run lint           # ESLint
npm run typecheck      # TypeScript tanpa emit
npm test               # tes aturan bisnis
npm run db:seed        # siapkan akun demo dan bersihkan log/laporan contoh lama
npm run db:push        # sinkronkan skema tanpa migrasi
npx prisma studio      # jelajah database
```
