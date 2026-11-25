import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLIENT_UPLOAD_EXTENSIONS, CLIENT_UPLOAD_MAX_FILES, DOCUMENT_SELECT, isBlobUrl } from "@/lib/portalServer";

// Registra la constancia de situación fiscal que el cliente acaba de subir
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  const ext = name.split(".").pop()?.toLowerCase();
  if (!isBlobUrl(body.url) || !name || !ext || !CLIENT_UPLOAD_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
  }
  const count = await prisma.projectDocument.count({ where: { projectId: project.id, kind: "tax_certificate", uploadedBy: "client" } });
  if (count >= CLIENT_UPLOAD_MAX_FILES) return NextResponse.json({ error: "Demasiados archivos" }, { status: 400 });

  const doc = await prisma.projectDocument.create({
    data: {
      projectId: project.id,
      kind: "tax_certificate",
      name,
      url: body.url,
      pathname: typeof body.pathname === "string" ? body.pathname : null,
      contentType: typeof body.contentType === "string" ? body.contentType.slice(0, 100) : null,
      size: Number.isFinite(Number(body.size)) ? Math.round(Number(body.size)) : null,
      uploadedBy: "client",
    },
    select: DOCUMENT_SELECT,
  });
  return NextResponse.json(doc, { status: 201 });
}
