const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const ROMAWI = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

/** Zona waktu acuan aplikasi (Waktu Indonesia Barat). */
export const APP_TIMEZONE = "Asia/Jakarta";

/** Normalisasi tanggal ke tengah malam UTC untuk kolom @db.Date. */
export function toDateOnly(value: string | Date): Date {
  const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : value;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Pecah sebuah waktu menjadi komponen tanggal/jam menurut zona waktu aplikasi. */
function partsInAppZone(value: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const out: Record<string, string> = {};
  for (const part of parts) out[part.type] = part.value;
  return out;
}

/**
 * Tanggal "hari ini" (YYYY-MM-DD) menurut zona waktu aplikasi.
 * Dipakai agar siswa tetap mendapat tanggal yang benar walau server berjalan di UTC.
 */
export function todayInput(): string {
  const p = partsInAppZone(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/** Tanggal "hari ini" sebagai Date tengah malam UTC untuk kolom @db.Date. */
export function todayDate(): Date {
  return toDateOnly(todayInput());
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateShort(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Waktu lengkap (tanggal + jam) menurut zona waktu aplikasi. */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const p = partsInAppZone(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function formatDateInput(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

export function dayName(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return HARI[d.getUTCDay()];
}

export function romanMonth(monthIndex0: number): string {
  return ROMAWI[monthIndex0];
}

export const ATTENDANCE_LABEL: Record<string, string> = {
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
};

export const LOG_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  DIAJUKAN: "Diajukan",
  DISETUJUI: "Disetujui",
  REVISI: "Perlu Revisi",
};

export const REPORT_TYPE_LABEL: Record<string, string> = {
  MINGGUAN: "Mingguan",
  BULANAN: "Bulanan",
  AKHIR: "Akhir",
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  REVISI: "Perlu Revisi",
  FINAL: "Final",
};

export const ROLE_LABEL: Record<string, string> = {
  SISWA: "Siswa",
  PEMBIMBING: "Pembimbing Industri",
  HRD: "HRD",
  ADMIN: "Admin",
};
