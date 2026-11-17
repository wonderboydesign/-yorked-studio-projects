import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { LINK_SELECT, linkFields } from "@/lib/portalServer";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const { kind: _kind, ...data } = linkFields(body);
  const link = await prisma.portalLink.update({ where: { id: params.id }, data, select: LINK_SELECT });
  return NextResponse.json(link);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const link = await prisma.portalLink.findUnique({ where: { id: params.id } });
  if (!link) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (link.pathname) await del(link.url).catch(() => {});
  await prisma.portalLink.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
