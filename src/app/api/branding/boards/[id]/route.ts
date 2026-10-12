import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteBlobIfOwned } from "@/lib/brandingServer";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.notes !== undefined) data.notes = body.notes || null;

  const board = await prisma.moodboard.update({ where: { id: params.id }, data });
  return NextResponse.json(board);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  // Las imágenes del moodboard se borran en cascada; antes se limpian sus archivos
  const items = await prisma.brandItem.findMany({ where: { boardId: params.id } });
  await Promise.all(items.map(deleteBlobIfOwned));
  await prisma.moodboard.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
