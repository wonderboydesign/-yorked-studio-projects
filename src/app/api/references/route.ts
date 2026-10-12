import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { fetchExternalReferences, isFeedConfigured } from "@/lib/referenceFeed";

function parseTags(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return list
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

// Biblioteca del estudio + (si está configurado) el dashboard externo
export async function GET() {
  const references = await prisma.reference.findMany({ orderBy: { createdAt: "desc" } });

  let external: unknown[] = [];
  let externalError: string | null = null;
  if (isFeedConfigured()) {
    try {
      // Lo que ya se guardó en la biblioteca no se repite
      const saved = new Set(references.map((r) => r.url));
      external = (await fetchExternalReferences()).filter((r) => !saved.has(r.url));
    } catch (error) {
      externalError = error instanceof Error ? error.message : "No se pudo leer el dashboard";
    }
  }

  return NextResponse.json({
    references,
    external,
    feedConfigured: isFeedConfigured(),
    externalError,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Falta la imagen de la referencia" }, { status: 400 });
  }

  // Importar desde el dashboard externo dos veces devuelve la misma referencia
  const existing = await prisma.reference.findFirst({ where: { url } });
  if (existing) return NextResponse.json(existing);

  const reference = await prisma.reference.create({
    data: {
      url,
      pathname: body.pathname || null,
      title: body.title || null,
      sourceUrl: body.sourceUrl || null,
      notes: body.notes || null,
      tags: parseTags(body.tags),
      authorId: user.id,
    },
  });
  return NextResponse.json(reference, { status: 201 });
}
