import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default async function AuditPage() {
  await requireRole(["HRD", "ADMIN"]);
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <PageHeader title="Jejak Audit" subtitle="Riwayat perubahan status & penting (200 terbaru)." />
      <Alert error={undefined} />

      {logs.length === 0 ? (
        <EmptyState title="Belum ada aktivitas" />
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{log.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">
                    {log.actorName ?? "Sistem"} • {log.entityType}
                    {log.fromStatus ? ` • ${log.fromStatus} → ${log.toStatus}` : ""}
                  </p>
                  {log.note ? <p className="text-xs text-slate-500">{log.note}</p> : null}
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Link href="/admin" className="btn btn-secondary w-full">
          Kembali ke Kelola Data
        </Link>
      </div>
    </div>
  );
}
