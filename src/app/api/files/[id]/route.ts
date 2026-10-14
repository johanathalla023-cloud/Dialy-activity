import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const asset = await prisma.fileAsset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return new NextResponse("Berkas tidak ditemukan", { status: 404 });
  }
  const buffer = Buffer.from(asset.data, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
