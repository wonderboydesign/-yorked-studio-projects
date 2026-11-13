import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getStudio, normalizeWorks } from "@/lib/quotesServer";
import { StudioData } from "@/lib/quotes";

export async function GET() {
  return NextResponse.json(await getStudio());
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }
  const current = await getStudio();
  const next: StudioData = {
    ...current,
    ...body,
    bank: { ...current.bank, ...(body.bank ?? {}) },
    works: body.works !== undefined ? normalizeWorks(body.works) : current.works,
  };
  const stored = JSON.parse(JSON.stringify(next));
  await prisma.studioSettings.upsert({
    where: { id: "singleton" },
    update: { data: stored },
    create: { id: "singleton", data: stored },
  });

  // Fotos que se quitaron o reemplazaron: se borran del almacenamiento
  const kept = new Set(next.works.flatMap((w) => (w.images ?? []).map((im) => im.url)));
  const removed = current.works.flatMap((w) => (w.images ?? []).filter((im) => im.path && !kept.has(im.url)));
  await Promise.all(removed.map((im) => del(im.url).catch(() => {})));

  return NextResponse.json(next);
}
