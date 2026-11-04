import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuoteContent } from "@/lib/quotes";

// Público (sin sesión): el cliente aprueba la propuesta desde su liga
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({ where: { token: params.token } });
  if (!quote || quote.status === "draft") {
    return NextResponse.json({ error: "Propuesta no disponible" }, { status: 404 });
  }
  if (quote.status === "approved") {
    return NextResponse.json({ ok: true, alreadyApproved: true });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const option = typeof body.option === "string" ? body.option.slice(0, 8) : "";
  const content = quote.content as unknown as QuoteContent;

  if (!name) return NextResponse.json({ error: "Escribe tu nombre para aprobar." }, { status: 400 });
  if (!content.options.some((o) => o.key === option)) {
    return NextResponse.json({ error: "Elige una opción." }, { status: 400 });
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: "approved",
      approvedAt: new Date(),
      approvedOption: option,
      approvedName: name,
      approvedEmail: email || null,
      approvedNote: note || null,
    },
  });
  await prisma.prospect.update({ where: { id: quote.prospectId }, data: { stage: "won" } });
  return NextResponse.json({ ok: true });
}
