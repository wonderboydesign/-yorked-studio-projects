import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const doc = await prisma.projectDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (doc.pathname) await del(doc.url).catch(() => {});
  await prisma.projectDocument.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
