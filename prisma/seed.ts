import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

try {
  // Memuat .env saat dijalankan di luar Next.js (mis. `npm run db:seed`).
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
} catch {
  // abaikan bila .env tidak ada
}

const prisma = new PrismaClient();

const PASSWORD = "Password123!";
const DEMO_STUDENT_KEYS = ["s1", "s2", "s3", "s4", "s5"];
const DEMO_LOG_IDS = DEMO_STUDENT_KEYS.flatMap((key) => [
  ...Array.from({ length: 5 }, (_, index) => `log-${key}-approved-${index + 1}`),
  `log-${key}-izin`,
  `log-${key}-submitted`,
  `log-${key}-draft`,
  `log-${key}-revisi`,
]);

function dateOnly(daysAgo: number): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

async function upsertUser(email: string, name: string, role: string) {
  const passwordHash = await hashPassword(PASSWORD);
  return prisma.user.upsert({
    where: { email },
    update: { name, role: role as never, passwordHash, active: true },
    create: { email, name, role: role as never, passwordHash },
  });
}

async function clearDemoActivity() {
  await prisma.report.deleteMany({
    where: { id: { in: ["report-demo-s1", "report-demo-s4"] } },
  });
  const deleted = await prisma.dailyReport.deleteMany({
    where: { id: { in: DEMO_LOG_IDS } },
  });
  if (deleted.count > 0) {
    console.log(`Menghapus ${deleted.count} log contoh lama.`);
  }
}

async function main() {
  console.log("Menyiapkan akun demo dan data awal...");
  await clearDemoActivity();

  // ---------- Sekolah ----------
  const school1 = await prisma.school.upsert({
    where: { id: "school-smkn1" },
    update: { name: "SMK Negeri 1 Jakarta" },
    create: {
      id: "school-smkn1",
      name: "SMK Negeri 1 Jakarta",
      city: "Jakarta",
      address: "Jl. Budi Utomo No.7, Jakarta Pusat",
      principalName: "Drs. Hendra Gunawan, M.Pd.",
      email: "humas@smkn1jakarta.sch.id",
      phone: "021-3845678",
    },
  });

  const school2 = await prisma.school.upsert({
    where: { id: "school-smktn" },
    update: { name: "SMK Teknologi Nusantara" },
    create: {
      id: "school-smktn",
      name: "SMK Teknologi Nusantara",
      city: "Bekasi",
      address: "Jl. Ahmad Yani No.10, Bekasi",
      principalName: "Ir. Maya Kusuma, M.T.",
      email: "info@smktn.sch.id",
      phone: "021-8899123",
    },
  });

  // ---------- Divisi ----------
  const divOps = await prisma.division.upsert({
    where: { id: "div-operasional" },
    update: { name: "Operasional" },
    create: { id: "div-operasional", name: "Operasional", description: "Operasional harian & logistik" },
  });
  const divTech = await prisma.division.upsert({
    where: { id: "div-teknologi" },
    update: { name: "Teknologi" },
    create: { id: "div-teknologi", name: "Teknologi", description: "IT, pengembangan, dan infrastruktur" },
  });
  await prisma.division.upsert({
    where: { id: "div-marketing" },
    update: { name: "Marketing" },
    create: { id: "div-marketing", name: "Marketing", description: "Pemasaran dan komunikasi" },
  });

  // ---------- Akun ----------
  await upsertUser("admin@transhybrid.test", "Admin Trans Hybrid", "ADMIN");
  await upsertUser("hrd@transhybrid.test", "Rina Marlina (HRD)", "HRD");

  const supUser1 = await upsertUser("pembimbing1@transhybrid.test", "Budi Santoso", "PEMBIMBING");
  const supUser2 = await upsertUser("pembimbing2@transhybrid.test", "Siti Aminah", "PEMBIMBING");

  const sup1 = await prisma.supervisorProfile.upsert({
    where: { userId: supUser1.id },
    update: { divisionId: divOps.id, nip: "19850101-201001-1-001" },
    create: { userId: supUser1.id, divisionId: divOps.id, nip: "19850101-201001-1-001" },
  });
  const sup2 = await prisma.supervisorProfile.upsert({
    where: { userId: supUser2.id },
    update: { divisionId: divTech.id, nip: "19900202-201203-2-002" },
    create: { userId: supUser2.id, divisionId: divTech.id, nip: "19900202-201203-2-002" },
  });

  const studentDefs = [
    { key: "s1", name: "Andi Pratama", nis: "2024001", email: "siswa1@transhybrid.test", schoolId: school1.id, className: "XII RPL 1", supervisor: sup1.id, division: divOps.id },
    { key: "s2", name: "Bunga Lestari", nis: "2024002", email: "siswa2@transhybrid.test", schoolId: school1.id, className: "XII RPL 1", supervisor: sup1.id, division: divOps.id },
    { key: "s3", name: "Citra Dewi", nis: "2024003", email: "siswa3@transhybrid.test", schoolId: school1.id, className: "XII TKJ 2", supervisor: sup1.id, division: divOps.id },
    { key: "s4", name: "Dimas Saputra", nis: "2024004", email: "siswa4@transhybrid.test", schoolId: school2.id, className: "XII RPL 3", supervisor: sup2.id, division: divTech.id },
    { key: "s5", name: "Eka Wijaya", nis: "2024005", email: "siswa5@transhybrid.test", schoolId: school2.id, className: "XII RPL 3", supervisor: sup2.id, division: divTech.id },
  ];

  for (const s of studentDefs) {
    const user = await upsertUser(s.email, s.name, "SISWA");
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { nis: s.nis, className: s.className, schoolId: s.schoolId },
      create: { userId: user.id, nis: s.nis, className: s.className, schoolId: s.schoolId, phone: "0812-0000-0000" },
    });
    await prisma.placement.upsert({
      where: { id: `placement-${s.key}` },
      update: { studentId: profile.id, supervisorId: s.supervisor, divisionId: s.division, active: true },
      create: {
        id: `placement-${s.key}`,
        studentId: profile.id,
        supervisorId: s.supervisor,
        divisionId: s.division,
        startDate: dateOnly(20),
        endDate: dateOnly(-70),
        active: true,
      },
    });
  }

  console.log("Selesai. Akun demo tetap tersedia; log dan laporan contoh sudah dikosongkan.");
  console.log("  Admin       : admin@transhybrid.test");
  console.log("  HRD         : hrd@transhybrid.test");
  console.log("  Pembimbing 1: pembimbing1@transhybrid.test (Operasional)");
  console.log("  Pembimbing 2: pembimbing2@transhybrid.test (Teknologi)");
  console.log("  Siswa 1-5   : siswa1..siswa5@transhybrid.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
