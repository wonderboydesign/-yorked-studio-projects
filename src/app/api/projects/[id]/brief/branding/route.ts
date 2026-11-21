import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BriefAnswers, BriefQuestion, briefToText } from "@/lib/brief";

// Pasa las respuestas del formulario al Brief de Branding del proyecto. Si ya
// había texto, el formulario se agrega debajo (no se borra nada).
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const brief = await prisma.projectBrief.findUnique({ where: { projectId: params.id } });
  if (!brief) return NextResponse.json({ error: "Este proyecto no tiene brief" }, { status: 404 });
  const text = briefToText(brief.title, brief.questions as unknown as BriefQuestion[], brief.answers as unknown as BriefAnswers);
  const workspace = await prisma.brandWorkspace.findUnique({ where: { projectId: params.id } });
  const existing = workspace?.brief?.trim();
  const merged = existing ? `${existing}\n\n———\n\n${text}` : text;
  await prisma.brandWorkspace.upsert({
    where: { projectId: params.id },
    update: { brief: merged },
    create: { projectId: params.id, brief: merged },
  });
  return NextResponse.json({ ok: true, appended: !!existing });
}
