import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_INTRO, DEFAULT_TITLE, defaultQuestions, sanitizeQuestions } from "@/lib/brief";

function shape(b: { title: string; intro: string | null; questions: unknown; answers: unknown; status: string; submittedAt: Date | null; updatedAt: Date }) {
  return { title: b.title, intro: b.intro, questions: b.questions, answers: b.answers, status: b.status, submittedAt: b.submittedAt, updatedAt: b.updatedAt };
}

// Brief del cliente (formulario del portal): lo ve y edita el estudio
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const brief = await prisma.projectBrief.findUnique({ where: { projectId: params.id } });
  return NextResponse.json(brief ? shape(brief) : null);
}

// Activar el brief del cliente con la plantilla del estudio
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const brief = await prisma.projectBrief.upsert({
    where: { projectId: params.id },
    update: {},
    create: { projectId: params.id, title: DEFAULT_TITLE, intro: DEFAULT_INTRO, questions: defaultQuestions() as object[] },
  });
  return NextResponse.json(shape(brief));
}

// Editar título, introducción y preguntas
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const data: { title?: string; intro?: string | null; questions?: object[]; status?: string; submittedAt?: Date | null } = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 120);
  if (typeof body.intro === "string") data.intro = body.intro.trim().slice(0, 1000) || null;
  if (body.questions !== undefined) {
    const questions = sanitizeQuestions(body.questions);
    if (!questions) return NextResponse.json({ error: "Preguntas no válidas" }, { status: 400 });
    data.questions = questions as object[];
  }
  // Reabrir el brief para que el cliente lo siga editando
  if (body.reopen === true) {
    data.status = "draft";
    data.submittedAt = null;
  }
  const exists = await prisma.projectBrief.findUnique({ where: { projectId: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Este proyecto no tiene brief" }, { status: 404 });
  const brief = await prisma.projectBrief.update({ where: { projectId: params.id }, data });
  return NextResponse.json(shape(brief));
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.projectBrief.deleteMany({ where: { projectId: params.id } });
  return NextResponse.json({ ok: true });
}
