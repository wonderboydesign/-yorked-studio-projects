import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title || null;
  if (body.sourceUrl !== undefined) data.sourceUrl = body.sourceUrl || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.tags !== undefined) {
    const list: unknown[] = Array.isArray(body.tags) ? body.tags : String(body.tags).split(",");
    data.tags = list
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  const reference = await prisma.reference.update({ where: { id: params.id }, data });
  return NextResponse.json(reference);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const reference = await prisma.reference.findUnique({
    where: { id: params.id },
    include: { _count: { select: { usedIn: true } } },
  });
  if (!reference) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  // Si algún moodboard la usa, la imagen se queda para no dejarlo roto
  if (reference.pathname && reference._count.usedIn === 0) {
    await del(reference.url).catch(() => {});
  }
  await prisma.reference.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
