import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redistribute } from "@/lib/portal";
import { DOCUMENT_SELECT, LINK_SELECT, PAYMENT_SELECT, ensurePayments, newPortalToken, projectProgress, projectQuote } from "@/lib/portalServer";

async function state(projectId: string) {
  // Antes el IVA era de todo el proyecto: se pasa a cada pago una sola vez
  const legacy = await prisma.project.findUnique({ where: { id: projectId }, select: { withIva: true } });
  if (legacy?.withIva) {
    await prisma.$transaction([
      prisma.payment.updateMany({ where: { projectId }, data: { withIva: true } }),
      prisma.project.update({ where: { id: projectId }, data: { withIva: false } }),
    ]);
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, portalToken: true, portalViewedAt: true, priceTotal: true, progressOverride: true, creditBalance: true, creditNote: true, creditVisible: true, estimatedEnd: true },
  });
  if (!project) return null;
  const [payments, progress, quote, documents, links, supplierQuotes] = await Promise.all([
    prisma.payment.findMany({ where: { projectId }, select: PAYMENT_SELECT, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    projectProgress(projectId),
    projectQuote(projectId),
    prisma.projectDocument.findMany({ where: { projectId }, select: DOCUMENT_SELECT, orderBy: { createdAt: "desc" } }),
    prisma.portalLink.findMany({ where: { projectId }, select: LINK_SELECT, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.supplierQuote.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    ...project,
    payments,
    progress,
    documents,
    links,
    supplierQuotes,
    hasApprovedQuote: quote?.status === "approved",
    // La propuesta que el cliente puede abrir (no los borradores)
    quoteToken: quote && quote.status !== "draft" ? quote.token : null,
  };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const s = await state(params.id);
  return s ? NextResponse.json(s) : NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
}

// enable: crea la liga (y los pagos desde la propuesta, si no hay)
// regenerate: liga nueva, la anterior deja de funcionar · disable: sin liga
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const { action } = body;
  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { portalToken: true } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  if (action === "enable") {
    if (!project.portalToken) await prisma.project.update({ where: { id: params.id }, data: { portalToken: newPortalToken() } });
    await ensurePayments(params.id);
  } else if (action === "regenerate") {
    await prisma.project.update({ where: { id: params.id }, data: { portalToken: newPortalToken() } });
  } else if (action === "progress") {
    // Ajuste manual: porcentaje (0–100) y/o fecha estimada de entrega. null
    // los quita y vuelve al cálculo automático.
    const data: { progressOverride?: number | null; estimatedEnd?: Date | null } = {};
    if (body.progressOverride === null) data.progressOverride = null;
    else if (body.progressOverride !== undefined) {
      const n = Math.round(Number(body.progressOverride));
      if (!Number.isFinite(n) || n < 0 || n > 100) return NextResponse.json({ error: "El porcentaje va de 0 a 100" }, { status: 400 });
      data.progressOverride = n;
    }
    if (body.estimatedEnd === null) data.estimatedEnd = null;
    else if (body.estimatedEnd !== undefined) {
      if (typeof body.estimatedEnd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.estimatedEnd)) {
        return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
      }
      data.estimatedEnd = new Date(`${body.estimatedEnd}T00:00:00Z`);
    }
    await prisma.project.update({ where: { id: params.id }, data });
  } else if (action === "credit") {
      const data: { creditBalance?: number | null; creditNote?: string | null; creditVisible?: boolean } = {};
      if (body.creditBalance === null) data.creditBalance = null;
      else if (body.creditBalance !== undefined) {
        const n = Math.round(Number(body.creditBalance) * 100) / 100;
        if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "El saldo a favor no es válido" }, { status: 400 });
        data.creditBalance = n === 0 ? null : n;
      }
      if (body.creditNote !== undefined) data.creditNote = typeof body.creditNote === "string" && body.creditNote.trim() ? body.creditNote.trim().slice(0, 300) : null;
      if (typeof body.creditVisible === "boolean") data.creditVisible = body.creditVisible;
      await prisma.project.update({ where: { id: params.id }, data });
    } else if (action === "price") {
    // Precio completo (sin IVA): interno; el cliente solo ve lo que paga. Si
    // cambia, se reparte entre los pagos pendientes (el IVA va por pago).
    const data: { priceTotal?: number | null } = {};
    if (body.priceTotal === null) data.priceTotal = null;
    else if (body.priceTotal !== undefined) {
      const n = Number(body.priceTotal);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "Precio no válido" }, { status: 400 });
      data.priceTotal = Math.round(n * 100) / 100;
    }
    await prisma.project.update({ where: { id: params.id }, data });
    if (typeof data.priceTotal === "number") {
      const payments = await prisma.payment.findMany({
        where: { projectId: params.id },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      const changes = redistribute(payments.map((p) => ({ id: p.id, amount: p.amount, paid: !!p.paidAt })), data.priceTotal);
      // "Finiquito 50%" deja de ser 50% al cambiar el precio: se quita el porcentaje
      const byId = new Map(payments.map((p) => [p.id, p]));
      await prisma.$transaction(
        changes
          .filter((c) => byId.get(c.id)!.amount !== c.amount)
          .map((c) =>
            prisma.payment.update({
              where: { id: c.id },
              data: { amount: c.amount, label: byId.get(c.id)!.label.replace(/\s*\d+(?:[.,]\d+)?\s*%$/, "") || byId.get(c.id)!.label },
            })
          )
      );
    }
  } else if (action === "disable") {
    await prisma.project.update({ where: { id: params.id }, data: { portalToken: null } });
  } else {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }
  return NextResponse.json(await state(params.id));
}
