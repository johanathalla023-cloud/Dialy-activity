const DEV_SECRET = "dev-secret-jangan-dipakai-di-produksi-1234567890";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Kunci penandatangan sesi. Di produksi nilainya WAJIB diatur dengan benar:
 * kalau kosong / masih memakai nilai contoh / kurang dari 32 karakter, aplikasi
 * langsung berhenti (fail-fast) daripada berjalan dengan sesi yang bisa dipalsukan.
 */
function resolveAuthSecret(): string {
  const value = (process.env.AUTH_SECRET ?? "").trim();
  const valid = value.length >= 32 && value !== DEV_SECRET;
  if (valid) return value;
  if (isProduction) {
    throw new Error(
      "AUTH_SECRET belum diatur dengan benar. Set AUTH_SECRET minimal 32 karakter acak " +
        "di Environment Variables (Production & Preview), lalu redeploy.",
    );
  }
  return DEV_SECRET;
}

/** URL publik aplikasi. Di Vercel otomatis memakai VERCEL_URL bila APP_URL tidak diisi. */
function resolveAppUrl(): string {
  const explicit = (process.env.APP_URL ?? "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const env = {
  appUrl: resolveAppUrl(),
  authSecret: resolveAuthSecret(),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 1025),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "Daily Activity PKL <no-reply@transhybrid.test>",
  linkExpiryDays: Number(process.env.LINK_EXPIRY_DAYS || 7),
  companyName: "Trans Hybrid",
};
