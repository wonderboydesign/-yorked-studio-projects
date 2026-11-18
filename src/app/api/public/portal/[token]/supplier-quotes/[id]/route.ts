import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// El cliente aprueba desde su portal una cotización de proveedor
export async function POST(_request: NextRequest, { params }: { params: { token: string; id: string } }) {
  const project = await prisma.project.findFirst({ where: { portalToken: params.token }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });
  const q = await prisma.supplierQuote.findFirst({ where: { id: params.id, projectId: project.id } });
  if (!q) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (q.status !== "approved") {
    await prisma.supplierQuote.update({ where: { id: q.id }, data: { status: "approved", approvedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
