import type { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { toDateOnly } from "@/lib/format";
import { AppError } from "./errors";
import { recordAudit } from "./audit";
import type { Actor, Db } from "./types";

function requireManager(actor: Actor) {
  if (actor.role !== "HRD" && actor.role !== "ADMIN") {
    throw new AppError("AKSES_DITOLAK", "Hanya HRD/Admin yang dapat mengelola data.", 403);
  }
}

export async function createSchool(
  db: Db,
  actor: Actor,
  input: { name: string; city?: string; address?: string; principalName?: string; email?: string; phone?: string },
) {
  requireManager(actor);
  if (!input.name?.trim()) throw new AppError("NAMA_WAJIB", "Nama sekolah wajib diisi.");
  const school = await db.school.create({
    data: {
      name: input.name.trim(),
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      principalName: input.principalName?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    },
  });
  await recordAudit(db, { actor, action: "SEKOLAH_DIBUAT", entityType: "School", entityId: school.id, note: school.name });
  return school;
}

export async function createDivision(
  db: Db,
  actor: Actor,
  input: { name: string; description?: string },
) {
  requireManager(actor);
  if (!input.name?.trim()) throw new AppError("NAMA_WAJIB", "Nama divisi wajib diisi.");
  const division = await db.division.create({
    data: { name: input.name.trim(), description: input.description?.trim() || null },
  });
  await recordAudit(db, { actor, action: "DIVISI_DIBUAT", entityType: "Division", entityId: division.id, note: division.name });
  return division;
}

export type CreateUserInput = {
  email: string;
  name: string;
  role: Role;
  password: string;
  nis?: string;
  className?: string;
  phone?: string;
  schoolId?: string;
  nip?: string;
  divisionId?: string;
};

/** HRD membuat akun. HRD hanya boleh membuat SISWA/PEMBIMBING; ADMIN boleh semua. */
export async function createUser(db: Db, actor: Actor, input: CreateUserInput) {
  requireManager(actor);
  if (actor.role === "HRD" && input.role !== "SISWA" && input.role !== "PEMBIMBING") {
    throw new AppError("AKSES_DITOLAK", "HRD hanya dapat membuat akun Siswa dan Pembimbing.", 403);
  }
  const email = input.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("EMAIL_TIDAK_VALID", "Email tidak valid.");
  }
  if (!input.name?.trim()) throw new AppError("NAMA_WAJIB", "Nama wajib diisi.");
  if (!input.password || input.password.length < 6) {
    throw new AppError("PASSWORD_LEMAH", "Kata sandi minimal 6 karakter.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new AppError("EMAIL_TERPAKAI", "Email sudah terdaftar.");

  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({
    data: {
      email,
      name: input.name.trim(),
      role: input.role,
      passwordHash,
      studentProfile:
        input.role === "SISWA"
          ? {
              create: {
                nis: input.nis?.trim() || `SISWA-${Date.now()}`,
                className: input.className?.trim() || null,
                phone: input.phone?.trim() || null,
                schoolId: input.schoolId || (await db.school.findFirst())?.id || "",
              },
            }
          : undefined,
      supervisorProfile:
        input.role === "PEMBIMBING"
          ? {
              create: {
                nip: input.nip?.trim() || null,
                divisionId: input.divisionId || (await db.division.findFirst())?.id || "",
              },
            }
          : undefined,
    },
  });

  await recordAudit(db, {
    actor,
    action: "AKUN_DIBUAT",
    entityType: "User",
    entityId: user.id,
    note: `${user.name} (${user.role})`,
  });
  return user;
}

export async function toggleUserActive(db: Db, actor: Actor, userId: string) {
  requireManager(actor);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("PENGGUNA_TIDAK_DITEMUKAN", "Pengguna tidak ditemukan.", 404);
  const updated = await db.user.update({ where: { id: userId }, data: { active: !user.active } });
  await recordAudit(db, {
    actor,
    action: updated.active ? "AKUN_DIAKTIFKAN" : "AKUN_DINONAKTIFKAN",
    entityType: "User",
    entityId: userId,
    note: updated.email,
  });
  return updated;
}

/** Penempatan siswa ke pembimbing + divisi. Penempatan aktif lama otomatis dinonaktifkan. */
export async function createPlacement(
  db: Db,
  actor: Actor,
  input: { studentId: string; supervisorId: string; divisionId: string; startDate: string | Date; endDate?: string | Date | null },
) {
  requireManager(actor);
  if (!input.studentId || !input.supervisorId || !input.divisionId) {
    throw new AppError("DATA_TIDAK_LENGKAP", "Siswa, pembimbing, dan divisi wajib dipilih.");
  }
  const startDate = toDateOnly(input.startDate);
  const endDate = input.endDate ? toDateOnly(input.endDate) : null;

  const placement = await (db as PrismaClient).$transaction(async (tx) => {
    await tx.placement.updateMany({
      where: { studentId: input.studentId, active: true },
      data: { active: false },
    });
    return tx.placement.create({
      data: {
        studentId: input.studentId,
        supervisorId: input.supervisorId,
        divisionId: input.divisionId,
        startDate,
        endDate,
        active: true,
      },
    });
  });

  await recordAudit(db, {
    actor,
    action: "PENEMPATAN_DIBUAT",
    entityType: "Placement",
    entityId: placement.id,
    note: `Siswa ${input.studentId} -> Pembimbing ${input.supervisorId}`,
  });
  return placement;
}

/* ----------------------------- Query ----------------------------- */

export async function listSchools(db: Db) {
  return db.school.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { students: true } } } });
}

export async function listDivisions(db: Db) {
  return db.division.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { supervisors: true, placements: true } } },
  });
}

export async function listUsers(db: Db) {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      studentProfile: { include: { school: true } },
      supervisorProfile: { include: { division: true } },
    },
  });
}

export async function listStudents(db: Db) {
  return db.studentProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: {
      user: true,
      school: true,
      placements: {
        where: { active: true },
        include: { supervisor: { include: { user: true } }, division: true },
      },
    },
  });
}

export async function listSupervisors(db: Db) {
  return db.supervisorProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: { user: true, division: true },
  });
}

export async function listPlacements(db: Db) {
  return db.placement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { user: true } },
      supervisor: { include: { user: true } },
      division: true,
    },
  });
}
