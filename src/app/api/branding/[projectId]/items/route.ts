import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { BRAND_STAGE_KEYS, ITEM_INCLUDE, pickItemFields } from "@/lib/brandingServer";

const KINDS = ["comment", "file", "reference", "concept", "idea", "image", "piece", "competitor", "insight"];

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  if (!BRAND_STAGE_KEYS.includes(body.section) || !KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "Etapa o tipo de pieza no válido" }, { status: 400 });
  }

  // Ligada a la biblioteca: se usa la imagen de la referencia, sin pathname
  // propio para que al borrar la pieza no se borre el archivo de la biblioteca
  let fromReference: Record<string, unknown> = {};
  if (typeof body.referenceId === "string" && body.referenceId) {
    const reference = await prisma.reference.findUnique({ where: { id: body.referenceId } });
    if (!reference) {
      return NextResponse.json({ error: "Referencia no encontrada" }, { status: 404 });
    }
    fromReference = {
      referenceId: reference.id,
      url: reference.url,
      pathname: null,
      linkUrl: reference.sourceUrl,
      title: body.title ?? reference.title,
    };
  }

  const last = await prisma.brandItem.findFirst({
    where: { projectId: params.projectId, section: body.section },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const item = await prisma.brandItem.create({
    data: {
      ...pickItemFields(body),
      ...fromReference,
      projectId: params.projectId,
      section: body.section,
      kind: body.kind,
      aiGenerated: false,
      order: (last?.order ?? 0) + 1,
      authorId: user.id,
    },
    include: ITEM_INCLUDE,
  });

  return NextResponse.json(item, { status: 201 });
}
