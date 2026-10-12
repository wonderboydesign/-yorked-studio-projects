import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ITEM_INCLUDE, deleteBlobIfOwned, pickItemFields } from "@/lib/brandingServer";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const item = await prisma.brandItem.update({
    where: { id: params.id },
    data: pickItemFields(body),
    include: ITEM_INCLUDE,
  });
  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const item = await prisma.brandItem.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await deleteBlobIfOwned(item);
  await prisma.brandItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
