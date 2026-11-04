import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudio } from "@/lib/quotesServer";

export async function GET() {
  return NextResponse.json(await getStudio());
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }
  const current = await getStudio();
  const next = { ...current, ...body, bank: { ...current.bank, ...(body.bank ?? {}) } };
  await prisma.studioSettings.upsert({
    where: { id: "singleton" },
    update: { data: next },
    create: { id: "singleton", data: next },
  });
  return NextResponse.json(next);
}
