import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentActor } from "@/lib/actor";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await currentActor();
  if (!actor) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `Ukuran file maksimal ${MAX_UPLOAD_LABEL}.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await prisma.fileAsset.create({
    data: {
      filename: file.name || "berkas",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: buffer.toString("base64"),
      uploadedById: actor.userId,
    },
  });

  return NextResponse.json({
    id: asset.id,
    filename: asset.filename,
    url: `/api/files/${asset.id}`,
  });
}
