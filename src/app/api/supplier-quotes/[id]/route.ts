import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { supplierQuoteFields } from "@/lib/portalServer";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const data = supplierQuoteFields(body);
  if (body.status === "pending") Object.assign(data, { status: "pending", approvedAt: null });
  const q = await prisma.supplierQuote.update({ where: { id: params.id }, data });
  return NextResponse.json(q);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const q = await prisma.supplierQuote.findUnique({ where: { id: params.id } });
  if (!q) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (q.filePath && q.fileUrl) await del(q.fileUrl).catch(() => {});
  await prisma.supplierQuote.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
