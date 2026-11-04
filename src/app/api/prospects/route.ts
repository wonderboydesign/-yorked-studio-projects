import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUOTE_SUMMARY_SELECT, pickProspectFields } from "@/lib/quotesServer";

export async function GET() {
  const prospects = await prisma.prospect.findMany({
    include: { quotes: { select: QUOTE_SUMMARY_SELECT, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(prospects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = pickProspectFields(body);
  if (!data.brandName) {
    return NextResponse.json({ error: "Falta el nombre de la marca" }, { status: 400 });
  }
  const prospect = await prisma.prospect.create({
    data: data as { brandName: string },
    include: { quotes: { select: QUOTE_SUMMARY_SELECT } },
  });
  return NextResponse.json(prospect, { status: 201 });
}
