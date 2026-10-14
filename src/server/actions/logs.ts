"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentActor } from "@/lib/actor";
import type { Attendance } from "@prisma/client";
import {
  approveLog,
  errorMessage,
  requestLogRevision,
  saveStudentLog,
  submitLog,
} from "@/server/services";
import { redirectWith } from "./util";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function opt(formData: FormData, key: string): string | null {
  const v = s(formData, key).trim();
  return v.length ? v : null;
}

export async function saveLogAction(formData: FormData) {
  const actor = await currentActor();
  const logId = opt(formData, "logId");
  const target = logId ? `/logs/${logId}` : "/logs/new";
  if (!actor) redirectWith("/login", {});

  try {
    const log = await saveStudentLog(prisma, actor, {
      date: s(formData, "date"),
      attendance: s(formData, "attendance") as Attendance,
      checkIn: opt(formData, "checkIn"),
      checkOut: opt(formData, "checkOut"),
      activity: opt(formData, "activity"),
      result: opt(formData, "result"),
      obstacle: opt(formData, "obstacle"),
      photoId: opt(formData, "photoId"),
      reason: opt(formData, "reason"),
      proofId: opt(formData, "proofId"),
    });

    if (s(formData, "intent") === "submit") {
      await submitLog(prisma, actor, log.id);
      revalidatePath("/logs");
      revalidatePath("/approvals");
      revalidatePath("/dashboard");
      redirectWith(`/logs/${log.id}`, { ok: "Log berhasil diajukan ke pembimbing." });
    }

    revalidatePath("/logs");
    revalidatePath("/dashboard");
    redirectWith(`/logs/${log.id}`, { ok: "Draft log berhasil disimpan." });
  } catch (err) {
    redirectWith(target, { error: errorMessage(err) });
  }
}

export async function submitLogAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const logId = s(formData, "logId");
  try {
    const log = await submitLog(prisma, actor, logId);
    revalidatePath("/logs");
    revalidatePath(`/logs/${log.id}`);
    revalidatePath("/dashboard");
    redirectWith(`/logs/${log.id}`, { ok: "Log berhasil diajukan ke pembimbing." });
  } catch (err) {
    redirectWith(`/logs/${logId}`, { error: errorMessage(err) });
  }
}

export async function approveLogAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const logId = s(formData, "logId");
  try {
    await approveLog(prisma, actor, logId, opt(formData, "note"));
    revalidatePath("/approvals");
    revalidatePath("/dashboard");
    redirectWith("/approvals", { ok: "Log disetujui dan terkunci." });
  } catch (err) {
    redirectWith(`/approvals/${logId}`, { error: errorMessage(err) });
  }
}

export async function requestRevisionAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const logId = s(formData, "logId");
  try {
    await requestLogRevision(prisma, actor, logId, s(formData, "note"));
    revalidatePath("/approvals");
    revalidatePath("/dashboard");
    redirectWith("/approvals", { ok: "Permintaan revisi terkirim ke siswa." });
  } catch (err) {
    redirectWith(`/approvals/${logId}`, { error: errorMessage(err) });
  }
}
