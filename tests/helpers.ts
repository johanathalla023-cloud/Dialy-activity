import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import type { Actor } from "@/server/services";
import { TEST_DB_URL } from "./db-url";

export function testPrisma() {
  return new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
}

export const TABLES = [
  "AuditLog",
  "EmailOutbox",
  "FileAsset",
  "ReportSend",
  "ReportItem",
  "Report",
  "DailyReport",
  "Placement",
  "SupervisorProfile",
  "StudentProfile",
  "User",
  "Division",
  "School",
];

export async function truncateAll(db: PrismaClient) {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

export type World = Awaited<ReturnType<typeof createWorld>>;

export async function createWorld(db: PrismaClient) {
  const passwordHash = await hashPassword("Password123!");

  const school = await db.school.create({ data: { name: "SMK Uji", email: "sekolah@uji.test" } });
  const division = await db.division.create({ data: { name: "Divisi Uji" } });

  const supUser = await db.user.create({
    data: { email: "sup@uji.test", name: "Pembimbing Uji", role: "PEMBIMBING", passwordHash },
  });
  const sup2User = await db.user.create({
    data: { email: "sup2@uji.test", name: "Pembimbing Lain", role: "PEMBIMBING", passwordHash },
  });
  const hrdUser = await db.user.create({
    data: { email: "hrd@uji.test", name: "HRD Uji", role: "HRD", passwordHash },
  });
  const stuUser = await db.user.create({
    data: { email: "stu@uji.test", name: "Siswa Uji", role: "SISWA", passwordHash },
  });
  const stu2User = await db.user.create({
    data: { email: "stu2@uji.test", name: "Siswa Lain", role: "SISWA", passwordHash },
  });

  const supervisor = await db.supervisorProfile.create({
    data: { userId: supUser.id, divisionId: division.id },
  });
  const supervisor2 = await db.supervisorProfile.create({
    data: { userId: sup2User.id, divisionId: division.id },
  });
  const student = await db.studentProfile.create({
    data: { userId: stuUser.id, nis: "UJI-001", schoolId: school.id },
  });
  const student2 = await db.studentProfile.create({
    data: { userId: stu2User.id, nis: "UJI-002", schoolId: school.id },
  });

  await db.placement.create({
    data: {
      studentId: student.id,
      supervisorId: supervisor.id,
      divisionId: division.id,
      startDate: new Date(Date.UTC(2024, 0, 1)),
      active: true,
    },
  });
  await db.placement.create({
    data: {
      studentId: student2.id,
      supervisorId: supervisor2.id,
      divisionId: division.id,
      startDate: new Date(Date.UTC(2024, 0, 1)),
      active: true,
    },
  });

  const studentActor: Actor = {
    userId: stuUser.id,
    name: stuUser.name,
    role: "SISWA",
    studentId: student.id,
  };
  const student2Actor: Actor = {
    userId: stu2User.id,
    name: stu2User.name,
    role: "SISWA",
    studentId: student2.id,
  };
  const supervisorActor: Actor = {
    userId: supUser.id,
    name: supUser.name,
    role: "PEMBIMBING",
    supervisorId: supervisor.id,
  };
  const otherSupervisorActor: Actor = {
    userId: sup2User.id,
    name: sup2User.name,
    role: "PEMBIMBING",
    supervisorId: supervisor2.id,
  };
  const hrdActor: Actor = { userId: hrdUser.id, name: hrdUser.name, role: "HRD" };

  return {
    school,
    division,
    supervisor,
    supervisor2,
    student,
    student2,
    studentActor,
    student2Actor,
    supervisorActor,
    otherSupervisorActor,
    hrdActor,
  };
}
