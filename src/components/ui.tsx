import type { ReactNode } from "react";
import { LOG_STATUS_LABEL, REPORT_STATUS_LABEL } from "@/lib/format";

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "amber" | "emerald" | "rose" | "blue";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-brand-100 text-brand-700",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

const LOG_TONES: Record<string, "slate" | "amber" | "emerald" | "rose"> = {
  DRAFT: "slate",
  DIAJUKAN: "amber",
  DISETUJUI: "emerald",
  REVISI: "rose",
};

export function LogStatusBadge({ status }: { status: string }) {
  return <Badge tone={LOG_TONES[status] ?? "slate"}>{LOG_STATUS_LABEL[status] ?? status}</Badge>;
}

const REPORT_TONES: Record<string, "slate" | "emerald" | "rose" | "amber"> = {
  DRAFT: "slate",
  REVISI: "amber",
  FINAL: "emerald",
};

export function ReportStatusBadge({ status }: { status: string }) {
  return <Badge tone={REPORT_TONES[status] ?? "slate"}>{REPORT_STATUS_LABEL[status] ?? status}</Badge>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Alert({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        error
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {error || ok}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card text-center text-slate-500">
      <p className="font-medium text-slate-700">{title}</p>
      {hint ? <p className="mt-1 text-sm">{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
