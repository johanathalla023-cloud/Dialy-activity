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

/** Normalisasi tanggal ke tengah malam UTC untuk kolom @db.Date. */
export function toDateOnly(value: string | Date): Date {
  const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : value;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateShort(d)} ${hh}:${mi}`;
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
