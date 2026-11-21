import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Público (sin sesión, solo con la liga vigente): el cliente elige si requiere
// factura (se suma el IVA a sus pagos pendientes) y cómo paga cada pago
// pendiente (transferencia o efectivo). Los pagos ya pagados no se tocan.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  if (typeof body.invoice === "boolean") {
    await prisma.$transaction([
      prisma.project.update({ where: { id: project.id }, data: { wantsInvoice: body.invoice, invoiceChosenAt: new Date(), withIva: false } }),
      prisma.payment.updateMany({ where: { projectId: project.id, paidAt: null }, data: { withIva: body.invoice } }),
      // La propuesta aprobada muestra la misma elección
      prisma.quote.updateMany({ where: { status: "approved", prospect: { projectId: project.id } }, data: { wantsInvoice: body.invoice, invoiceChosenAt: new Date() } }),
    ]);
  }

  if (body.paymentId !== undefined) {
    const method = body.method === "cash" ? "cash" : body.method === "transfer" ? "transfer" : null;
    if (typeof body.paymentId !== "string" || !method) return NextResponse.json({ error: "Forma de pago no válida" }, { status: 400 });
    const result = await prisma.payment.updateMany({
      where: { id: body.paymentId, projectId: project.id, paidAt: null },
      data: { method, methodChosenAt: new Date() },
    });
    if (result.count === 0) return NextResponse.json({ error: "Ese pago ya no se puede cambiar" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
