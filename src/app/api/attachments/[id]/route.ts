import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!attachment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await del(attachment.url).catch(() => {});
  await prisma.attachment.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
