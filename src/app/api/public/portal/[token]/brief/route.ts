import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BriefAnswers, BriefQuestion, missingRequired, sanitizeAnswers } from "@/lib/brief";

// Público (sin sesión, solo con la liga vigente): el cliente guarda sus
// respuestas del brief y lo envía
async function load(token: string) {
  const project = await prisma.project.findFirst({ where: { portalToken: token }, select: { id: true } });
  if (!project) return null;
  return prisma.projectBrief.findUnique({ where: { projectId: project.id } });
}

export async function PATCH(request: NextRequest, { params }: { params: { token: string } }) {
  const brief = await load(params.token);
  if (!brief) return NextResponse.json({ error: "Brief no encontrado" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const questions = brief.questions as unknown as BriefQuestion[];
  const incoming = sanitizeAnswers(body.answers, questions);
  if (!incoming) return NextResponse.json({ error: "Respuestas no válidas" }, { status: 400 });
  if (Object.keys(incoming).length === 0) return NextResponse.json({ ok: true });
  const answers = { ...(brief.answers as unknown as BriefAnswers), ...incoming };
  // Si ya lo había enviado y lo vuelve a editar, queda como borrador hasta que lo reenvíe
  await prisma.projectBrief.update({
    where: { id: brief.id },
    data: { answers, ...(brief.status === "submitted" ? { status: "draft", submittedAt: null } : {}) },
  });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const brief = await load(params.token);
  if (!brief) return NextResponse.json({ error: "Brief no encontrado" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const questions = brief.questions as unknown as BriefQuestion[];
  const incoming = body.answers ? sanitizeAnswers(body.answers, questions) : {};
  if (!incoming) return NextResponse.json({ error: "Respuestas no válidas" }, { status: 400 });
  const answers = { ...(brief.answers as unknown as BriefAnswers), ...incoming };
  const missing = missingRequired(questions, answers);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Falta responder: ${missing.map((q) => q.label).join("; ")}`, missing: missing.map((q) => q.id) }, { status: 400 });
  }
  await prisma.projectBrief.update({ where: { id: brief.id }, data: { answers, status: "submitted", submittedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
