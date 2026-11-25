import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLIENT_UPLOAD_EXTENSIONS, CLIENT_UPLOAD_MAX_BYTES, CLIENT_UPLOAD_MAX_FILES } from "@/lib/portalServer";

// Permiso para que el cliente suba su constancia desde el portal, sin sesión:
// solo con la liga del portal vigente, PDF o imagen y hasta 10 MB
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname.split(".").pop()?.toLowerCase();
        if (!ext || !CLIENT_UPLOAD_EXTENSIONS.includes(ext)) throw new Error("Sube un PDF, JPG o PNG.");
        const count = await prisma.projectDocument.count({ where: { projectId: project.id, kind: "tax_certificate", uploadedBy: "client" } });
        if (count >= CLIENT_UPLOAD_MAX_FILES) throw new Error("Ya hay muchos archivos; escríbenos por WhatsApp.");
        return { maximumSizeInBytes: CLIENT_UPLOAD_MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo subir" }, { status: 400 });
  }
}
