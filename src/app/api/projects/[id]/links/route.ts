import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LINK_SELECT, linkFields } from "@/lib/portalServer";

// Agrega una entrega, reunión o descargable de marca al portal del cliente
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const data = linkFields(body);
  // Solo las entregas pueden ir sin link; reuniones y descargables lo necesitan
  const needsUrl = data.kind !== "delivery";
  if (!data.kind || !data.title || (needsUrl && !data.url)) {
    return NextResponse.json({ error: "Falta el título o una liga válida (https://…)" }, { status: 400 });
  }
  if (body.url && !data.url) {
    return NextResponse.json({ error: "La liga debe empezar con https://" }, { status: 400 });
  }
  const link = await prisma.portalLink.create({
    data: { ...(data as { kind: string; title: string }), url: (data.url as string) ?? "", projectId: params.id },
    select: LINK_SELECT,
  });
  return NextResponse.json(link, { status: 201 });
}
