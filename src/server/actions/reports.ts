"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentActor } from "@/lib/actor";
import type { ReportType } from "@prisma/client";
import {
  createReport,
  errorMessage,
  finalizeReport,
  refreshReportItems,
  requestReportRevision,
  sendReport,
} from "@/server/services";
import { redirectWith } from "./util";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createReportAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  try {
    const report = await createReport(prisma, actor, {
      studentId: s(formData, "studentId"),
      type: s(formData, "type") as ReportType,
      periodStart: s(formData, "periodStart"),
      periodEnd: s(formData, "periodEnd"),
    });
    revalidatePath("/reports");
    redirectWith(`/reports/${report.id}`, { ok: `Laporan ${report.number} dibuat.` });
  } catch (err) {
    redirectWith("/reports/new", { error: errorMessage(err) });
  }
}

export async function regenerateReportAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const reportId = s(formData, "reportId");
  try {
    const { count } = await refreshReportItems(prisma, actor, reportId);
    revalidatePath(`/reports/${reportId}`);
    redirectWith(`/reports/${reportId}`, { ok: `Laporan disegarkan (${count} log disetujui).` });
  } catch (err) {
    redirectWith(`/reports/${reportId}`, { error: errorMessage(err) });
  }
}

export async function finalizeReportAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const reportId = s(formData, "reportId");
  try {
    await finalizeReport(prisma, actor, reportId);
    revalidatePath(`/reports/${reportId}`);
    revalidatePath("/reports");
    redirectWith(`/reports/${reportId}`, { ok: "Laporan difinalkan. Sekarang dapat dikirim." });
  } catch (err) {
    redirectWith(`/reports/${reportId}`, { error: errorMessage(err) });
  }
}

export async function requestReportRevisionAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const reportId = s(formData, "reportId");
  try {
    await requestReportRevision(prisma, actor, reportId, s(formData, "note"));
    revalidatePath(`/reports/${reportId}`);
    redirectWith(`/reports/${reportId}`, { ok: "Permintaan revisi laporan dicatat." });
  } catch (err) {
    redirectWith(`/reports/${reportId}`, { error: errorMessage(err) });
  }
}

export async function sendReportAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const reportId = s(formData, "reportId");
  try {
    const result = await sendReport(prisma, actor, {
      reportId,
      recipientEmail: s(formData, "recipientEmail"),
      recipientType: s(formData, "recipientType") || "SEKOLAH",
    });
    revalidatePath(`/reports/${reportId}`);
    redirectWith(`/reports/${reportId}`, {
      ok: `Laporan dikirim ke ${result.send.recipientEmail} (${result.status}).`,
    });
  } catch (err) {
    redirectWith(`/reports/${reportId}`, { error: errorMessage(err) });
  }
}
