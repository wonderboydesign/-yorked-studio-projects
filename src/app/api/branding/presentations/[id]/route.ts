import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (Array.isArray(body.slides)) data.slides = body.slides;

  const presentation = await prisma.presentation.update({ where: { id: params.id }, data });
  return NextResponse.json(presentation);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.presentation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
