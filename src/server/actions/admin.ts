"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentActor } from "@/lib/actor";
import type { Role } from "@prisma/client";
import {
  createDivision,
  createPlacement,
  createSchool,
  createUser,
  errorMessage,
  toggleUserActive,
} from "@/server/services";
import { redirectWith } from "./util";

function s(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createSchoolAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  try {
    await createSchool(prisma, actor, {
      name: s(formData, "name"),
      city: s(formData, "city"),
      address: s(formData, "address"),
      principalName: s(formData, "principalName"),
      email: s(formData, "email"),
      phone: s(formData, "phone"),
    });
    revalidatePath("/admin/schools");
    redirectWith("/admin/schools", { ok: "Sekolah ditambahkan." });
  } catch (err) {
    redirectWith("/admin/schools", { error: errorMessage(err) });
  }
}

export async function createDivisionAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  try {
    await createDivision(prisma, actor, {
      name: s(formData, "name"),
      description: s(formData, "description"),
    });
    revalidatePath("/admin/divisions");
    redirectWith("/admin/divisions", { ok: "Divisi ditambahkan." });
  } catch (err) {
    redirectWith("/admin/divisions", { error: errorMessage(err) });
  }
}

export async function createUserAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  const role = s(formData, "role") as Role;
  try {
    await createUser(prisma, actor, {
      email: s(formData, "email"),
      name: s(formData, "name"),
      role,
      password: s(formData, "password"),
      nis: s(formData, "nis") || undefined,
      className: s(formData, "className") || undefined,
      phone: s(formData, "phone") || undefined,
      schoolId: s(formData, "schoolId") || undefined,
      nip: s(formData, "nip") || undefined,
      divisionId: s(formData, "divisionId") || undefined,
    });
    revalidatePath("/admin/users");
    redirectWith("/admin/users", { ok: "Akun dibuat." });
  } catch (err) {
    redirectWith("/admin/users", { error: errorMessage(err) });
  }
}

export async function createPlacementAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  try {
    await createPlacement(prisma, actor, {
      studentId: s(formData, "studentId"),
      supervisorId: s(formData, "supervisorId"),
      divisionId: s(formData, "divisionId"),
      startDate: s(formData, "startDate"),
      endDate: s(formData, "endDate") || null,
    });
    revalidatePath("/admin/placements");
    redirectWith("/admin/placements", { ok: "Penempatan disimpan." });
  } catch (err) {
    redirectWith("/admin/placements", { error: errorMessage(err) });
  }
}

export async function toggleUserActiveAction(formData: FormData) {
  const actor = await currentActor();
  if (!actor) redirectWith("/login", {});
  try {
    await toggleUserActive(prisma, actor, s(formData, "userId"));
    revalidatePath("/admin/users");
    redirectWith("/admin/users", { ok: "Status akun diperbarui." });
  } catch (err) {
    redirectWith("/admin/users", { error: errorMessage(err) });
  }
}
