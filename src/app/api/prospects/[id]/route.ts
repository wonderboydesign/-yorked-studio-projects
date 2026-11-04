import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUOTE_SUMMARY_SELECT, pickProspectFields } from "@/lib/quotesServer";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const prospect = await prisma.prospect.update({
    where: { id: params.id },
    data: pickProspectFields(body),
    include: { quotes: { select: QUOTE_SUMMARY_SELECT, orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(prospect);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.prospect.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
