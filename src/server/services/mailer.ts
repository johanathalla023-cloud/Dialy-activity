import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import type { Db } from "./types";

export type MailInput = { to: string; subject: string; html: string };

export type MailResult = { status: "TERKIRIM" | "GAGAL" | "TERCATAT"; error: string | null };

/**
 * Kirim email. Bila SMTP tidak dikonfigurasi, email hanya dicatat ke
 * tabel EmailOutbox (outbox dev). Riwayat kirim tetap tersimpan di ReportSend.
 */
export async function sendMail(db: Db, input: MailInput): Promise<MailResult> {
  if (env.smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
      });
      await transporter.sendMail({
        from: env.smtpFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      await db.emailOutbox.create({
        data: { to: input.to, subject: input.subject, body: input.html, status: "TERKIRIM" },
      });
      return { status: "TERKIRIM", error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengirim email";
      await db.emailOutbox.create({
        data: {
          to: input.to,
          subject: input.subject,
          body: input.html,
          status: "GAGAL",
          error: message,
        },
      });
      return { status: "GAGAL", error: message };
    }
  }

  await db.emailOutbox.create({
    data: { to: input.to, subject: input.subject, body: input.html, status: "TERCATAT" },
  });
  return { status: "TERCATAT", error: null };
}
