import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultContent } from "@/lib/quotes";
import { newQuoteToken } from "@/lib/quotesServer";

// Nueva cotización para un prospecto, a partir de la plantilla del estudio
// (o duplicando otra, si se manda fromQuoteId)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const prospect = await prisma.prospect.findUnique({ where: { id: params.id } });
  if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  let content: object = defaultContent(prospect.brandName, prospect.category);
  if (typeof body.fromQuoteId === "string") {
    const source = await prisma.quote.findUnique({ where: { id: body.fromQuoteId } });
    if (source) content = { ...(source.content as object), issuedAt: new Date().toISOString() };
  }

  const quote = await prisma.quote.create({
    data: { prospectId: prospect.id, token: newQuoteToken(), content },
  });
  return NextResponse.json(quote, { status: 201 });
}
