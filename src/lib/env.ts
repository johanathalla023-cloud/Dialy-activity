export const env = {
  appUrl: process.env.APP_URL || "http://localhost:3000",
  authSecret:
    process.env.AUTH_SECRET || "dev-secret-jangan-dipakai-di-produksi-1234567890",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 1025),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "Daily Activity PKL <no-reply@transhybrid.test>",
  linkExpiryDays: Number(process.env.LINK_EXPIRY_DAYS || 7),
  companyName: "Trans Hybrid",
};
