import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { LINK_SELECT, linkFields } from "@/lib/portalServer";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const old = await prisma.portalLink.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const { kind: _kind, ...data } = linkFields(body);
  // Un link escrito debe ser válido; solo las entregas pueden quedarse sin link
  if (body.url !== undefined) {
    if (typeof body.url === "string" && body.url.trim() && data.url === undefined) {
      return NextResponse.json({ error: "La liga debe empezar con https://" }, { status: 400 });
    }
    if (data.url === "" && old.kind !== "delivery") {
      return NextResponse.json({ error: "Este tipo necesita un link o un archivo." }, { status: 400 });
    }
  }
  const link = await prisma.portalLink.update({ where: { id: params.id }, data, select: LINK_SELECT });
  // El archivo anterior se borra si se reemplazó por otro link o archivo
  if (old.pathname && old.url !== link.url) await del(old.url).catch(() => {});
  return NextResponse.json(link);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const link = await prisma.portalLink.findUnique({ where: { id: params.id } });
  if (!link) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (link.pathname) await del(link.url).catch(() => {});
  await prisma.portalLink.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
