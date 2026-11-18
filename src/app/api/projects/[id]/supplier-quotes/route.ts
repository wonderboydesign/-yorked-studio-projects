import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierQuoteFields } from "@/lib/portalServer";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const data = supplierQuoteFields(body);
  if (!data.title) return NextResponse.json({ error: "Falta el título de la cotización" }, { status: 400 });
  const q = await prisma.supplierQuote.create({
    data: { ...(data as { title: string; items: object }), items: (data.items as object) ?? [], projectId: params.id },
  });
  return NextResponse.json(q, { status: 201 });
}
