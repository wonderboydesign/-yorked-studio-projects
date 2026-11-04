import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUSES = ["draft", "sent", "viewed", "approved", "rejected"];

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.content && typeof body.content === "object" && !Array.isArray(body.content)) data.content = body.content;
  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status;
    if (body.status === "sent") data.sentAt = new Date();
  }
  const quote = await prisma.quote.update({ where: { id: params.id }, data });

  // Al marcarla como enviada, el prospecto pasa a "Cotizado" si estaba en "Nuevo"
  if (data.status === "sent") {
    await prisma.prospect.updateMany({ where: { id: quote.prospectId, stage: "new" }, data: { stage: "quoted" } });
  }
  return NextResponse.json(quote);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.quote.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
