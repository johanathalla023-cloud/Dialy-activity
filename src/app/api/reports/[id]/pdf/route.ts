import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { currentActor } from "@/lib/actor";
import { getReport, getReportForActor, type ReportDetail } from "@/server/services";
import { buildReportPdf } from "@/server/pdf";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  let report: ReportDetail | null = null;

  if (token) {
    // Akses publik via tautan aman (punya masa berlaku).
    const send = await prisma.reportSend.findUnique({ where: { token } });
    if (send && send.reportId === params.id && send.expiresAt.getTime() >= Date.now()) {
      report = await getReport(prisma, params.id);
    }
  } else {
    const user = await getCurrentUser();
    if (user) {
      const actor = await currentActor();
      if (actor) report = await getReportForActor(prisma, actor, params.id);
    }
  }

  if (!report) {
    return new NextResponse("Laporan tidak ditemukan atau akses ditolak.", { status: 404 });
  }

  const pdf = await buildReportPdf(report);
  const filename = `Laporan-${report.number.replace(/[^0-9A-Za-z]+/g, "-")}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
