import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBlobUrl } from "@/lib/portalServer";

// Público (sin sesión): el cliente deja registrado el comprobante del anticipo
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({ where: { token: params.token }, select: { id: true, status: true } });
  if (!quote || quote.status !== "approved") {
    return NextResponse.json({ error: "Primero aprueba la propuesta." }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!isBlobUrl(body.url)) return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
  await prisma.quote.update({
    where: { id: quote.id },
    data: { receiptUrl: body.url, receiptName: name || null, receiptAt: new Date() },
  });
  return NextResponse.json({ ok: true, receiptAt: new Date().toISOString() });
}
