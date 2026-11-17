import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMENT_SELECT, ensurePayments, newPortalToken, projectProgress, projectQuote } from "@/lib/portalServer";

async function state(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, portalToken: true, portalViewedAt: true },
  });
  if (!project) return null;
  const [payments, progress, quote] = await Promise.all([
    prisma.payment.findMany({ where: { projectId }, select: PAYMENT_SELECT, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    projectProgress(projectId),
    projectQuote(projectId),
  ]);
  return { ...project, payments, progress, hasApprovedQuote: quote?.status === "approved" };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const s = await state(params.id);
  return s ? NextResponse.json(s) : NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
}

// enable: crea la liga (y los pagos desde la propuesta, si no hay)
// regenerate: liga nueva, la anterior deja de funcionar · disable: sin liga
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { action } = await request.json().catch(() => ({}));
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { portalToken: true } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  if (action === "enable") {
    if (!project.portalToken) await prisma.project.update({ where: { id: params.id }, data: { portalToken: newPortalToken() } });
    await ensurePayments(params.id);
  } else if (action === "regenerate") {
    await prisma.project.update({ where: { id: params.id }, data: { portalToken: newPortalToken() } });
  } else if (action === "disable") {
    await prisma.project.update({ where: { id: params.id }, data: { portalToken: null } });
  } else {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }
  return NextResponse.json(await state(params.id));
}
