import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMENT_SELECT, ensurePayments, paymentFields } from "@/lib/portalServer";

// Agrega un pago, o con { fromQuote: true } crea anticipo y finiquito desde
// la propuesta aprobada (solo si el proyecto aún no tiene pagos)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (body.fromQuote) {
    const n = await ensurePayments(params.id);
    if (n === 0) return NextResponse.json({ error: "No hay propuesta aprobada o ya hay pagos." }, { status: 400 });
  } else {
    const data = paymentFields(body);
    if (!data.label || typeof data.amount !== "number") {
      return NextResponse.json({ error: "Falta concepto o monto" }, { status: 400 });
    }
    const last = await prisma.payment.findFirst({ where: { projectId: params.id }, orderBy: { order: "desc" }, select: { order: true } });
    await prisma.payment.create({
      data: { label: data.label as string, amount: data.amount as number, dueDate: (data.dueDate as Date) ?? null, projectId: params.id, order: (last?.order ?? 0) + 1 },
    });
  }
  const payments = await prisma.payment.findMany({
    where: { projectId: params.id },
    select: PAYMENT_SELECT,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(payments, { status: 201 });
}
