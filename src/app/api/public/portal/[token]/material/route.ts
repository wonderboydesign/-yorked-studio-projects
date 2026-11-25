import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_SELECT, MATERIAL_EXTENSIONS, MATERIAL_MAX_BYTES, MATERIAL_MAX_FILES, isBlobUrl } from "@/lib/portalServer";
import { notifyStudio } from "@/lib/notifications";

// Registra el material que el cliente acaba de subir (uno o varios archivos) y
// avisa una sola vez al estudio
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { id: true, name: true, materialEnabled: true } });
  if (!project || !project.materialEnabled) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const files: unknown[] = Array.isArray(body.files) ? body.files.slice(0, 20) : [];
  const valid = files.flatMap((f) => {
    const x = f as Record<string, unknown>;
    const name = typeof x.name === "string" ? x.name.trim().slice(0, 160) : "";
    const ext = name.split(".").pop()?.toLowerCase();
    if (!isBlobUrl(x.url) || !name || !ext || !MATERIAL_EXTENSIONS.includes(ext)) return [];
    const size = Number.isFinite(Number(x.size)) ? Math.round(Number(x.size)) : null;
    if (size !== null && size > MATERIAL_MAX_BYTES) return [];
    return [{
      url: x.url as string,
      name,
      pathname: typeof x.pathname === "string" ? x.pathname.slice(0, 500) : null,
      contentType: typeof x.contentType === "string" ? x.contentType.slice(0, 100) : null,
      size,
    }];
  });
  if (valid.length === 0) return NextResponse.json({ error: "Archivos no válidos" }, { status: 400 });

  const count = await prisma.projectDocument.count({ where: { projectId: project.id, kind: "client_material" } });
  if (count + valid.length > MATERIAL_MAX_FILES) return NextResponse.json({ error: "Demasiados archivos" }, { status: 400 });

  const docs = await prisma.$transaction(
    valid.map((f) =>
      prisma.projectDocument.create({
        data: { projectId: project.id, kind: "client_material", uploadedBy: "client", ...f },
        select: DOCUMENT_SELECT,
      })
    )
  );
  await notifyStudio({
    kind: "material",
    message: `📎 ${project.name} subió ${docs.length} ${docs.length === 1 ? "archivo" : "archivos"} de material`,
    projectId: project.id,
  });
  return NextResponse.json(docs, { status: 201 });
}
