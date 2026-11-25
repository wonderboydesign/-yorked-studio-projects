import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MATERIAL_CONTENT_TYPES, MATERIAL_EXTENSIONS, MATERIAL_MAX_BYTES, MATERIAL_MAX_FILES } from "@/lib/portalServer";

// Permiso para que el cliente suba su material (fotos, videos cortos, PDF) sin
// sesión: solo con la liga vigente, si el estudio activó "Tu material", con
// tipos permitidos y hasta 100 MB por archivo
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { id: true, materialEnabled: true } });
  if (!project || !project.materialEnabled) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname.split(".").pop()?.toLowerCase();
        if (!ext || !MATERIAL_EXTENSIONS.includes(ext)) throw new Error("Sube fotos (JPG, PNG, WebP, HEIC), videos cortos (MP4, MOV), PDF o ZIP.");
        const count = await prisma.projectDocument.count({ where: { projectId: project.id, kind: "client_material" } });
        if (count >= MATERIAL_MAX_FILES) throw new Error("Ya hay muchos archivos; usa el link para archivos grandes o escríbenos por WhatsApp.");
        return { allowedContentTypes: MATERIAL_CONTENT_TYPES, maximumSizeInBytes: MATERIAL_MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo subir" }, { status: 400 });
  }
}
