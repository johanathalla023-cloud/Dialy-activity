import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogForm } from "@/components/log-form";
import { Alert, PageHeader } from "@/components/ui";
import { todayInput, toDateOnly } from "@/lib/format";

export default async function NewLogPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await requireRole(["SISWA"]);
  const today = todayInput();

  const existing = await prisma.dailyReport.findUnique({
    where: { studentId_date: { studentId: user.studentId!, date: toDateOnly(today) } },
  });
  if (existing) redirect(`/logs/${existing.id}`);

  return (
    <div>
      <PageHeader title="Isi Log Harian" subtitle="Pilih status kehadiran lalu lengkapi datanya." />
      <Alert error={searchParams.error} />
      <div className="card">
        <LogForm values={{ date: today, attendance: "HADIR" }} />
      </div>
    </div>
  );
}
