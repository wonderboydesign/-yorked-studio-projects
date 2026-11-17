import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LINK_SELECT, linkFields } from "@/lib/portalServer";

// Agrega una entrega, reunión o descargable de marca al portal del cliente
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const data = linkFields(body);
  if (!data.kind || !data.title || !data.url) {
    return NextResponse.json({ error: "Falta el título o una liga válida (https://…)" }, { status: 400 });
  }
  const link = await prisma.portalLink.create({
    data: { ...(data as { kind: string; title: string; url: string }), projectId: params.id },
    select: LINK_SELECT,
  });
  return NextResponse.json(link, { status: 201 });
}
