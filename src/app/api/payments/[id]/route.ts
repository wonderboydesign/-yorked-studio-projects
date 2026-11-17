import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMENT_SELECT, paymentFields } from "@/lib/portalServer";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const payment = await prisma.payment.update({ where: { id: params.id }, data: paymentFields(body), select: PAYMENT_SELECT });
  return NextResponse.json(payment);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.payment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
