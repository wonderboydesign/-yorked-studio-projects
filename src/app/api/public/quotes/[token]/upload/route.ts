import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Permiso para que el cliente suba el comprobante de su anticipo desde la
// propuesta, sin sesión: solo con la liga vigente, ya aprobada, PDF o imagen
// y hasta 10 MB
const EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({ where: { token: params.token }, select: { status: true } });
  if (!quote || quote.status !== "approved") {
    return NextResponse.json({ error: "Primero aprueba la propuesta." }, { status: 404 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname.split(".").pop()?.toLowerCase();
        if (!ext || !EXTENSIONS.includes(ext)) throw new Error("Sube un PDF, JPG, PNG o WebP.");
        return { maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo subir" }, { status: 400 });
  }
}
