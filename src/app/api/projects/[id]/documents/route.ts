import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_SELECT, isBlobUrl } from "@/lib/portalServer";

// El estudio sube una factura (PDF o XML) para que el cliente la descargue
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  if (!isBlobUrl(body.url) || !name) return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
  const kind = body.kind === "tax_certificate" ? "tax_certificate" : "invoice";
  const doc = await prisma.projectDocument.create({
    data: {
      projectId: params.id,
      kind,
      name,
      url: body.url,
      pathname: typeof body.pathname === "string" ? body.pathname : null,
      contentType: typeof body.contentType === "string" ? body.contentType : null,
      size: Number.isFinite(Number(body.size)) ? Math.round(Number(body.size)) : null,
      uploadedBy: "studio",
    },
    select: DOCUMENT_SELECT,
  });
  return NextResponse.json(doc, { status: 201 });
}
