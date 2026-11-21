import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Público (sin sesión): una vez aprobada la propuesta, el cliente elige si
// requiere factura (se suma el IVA al anticipo). Si el proyecto ya tiene
// portal y pagos, la elección se aplica a sus pagos pendientes.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { token: params.token },
    select: { id: true, status: true, prospect: { select: { projectId: true } } },
  });
  if (!quote || quote.status !== "approved") {
    return NextResponse.json({ error: "Primero aprueba la propuesta." }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  if (typeof body.invoice !== "boolean") return NextResponse.json({ error: "Valor no válido" }, { status: 400 });

  const projectId = quote.prospect.projectId;
  await prisma.$transaction([
    prisma.quote.update({ where: { id: quote.id }, data: { wantsInvoice: body.invoice, invoiceChosenAt: new Date() } }),
    ...(projectId
      ? [
          prisma.project.update({ where: { id: projectId }, data: { wantsInvoice: body.invoice, invoiceChosenAt: new Date(), withIva: false } }),
          prisma.payment.updateMany({ where: { projectId, paidAt: null }, data: { withIva: body.invoice } }),
        ]
      : []),
  ]);
  return NextResponse.json({ ok: true });
}
