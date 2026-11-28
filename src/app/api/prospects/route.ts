import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUOTE_SUMMARY_SELECT, pickProspectFields } from "@/lib/quotesServer";
import { loadAlerts } from "@/lib/clientAlerts";

export async function GET() {
  const prospects = await prisma.prospect.findMany({
    include: { quotes: { select: QUOTE_SUMMARY_SELECT, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  // Pendientes por revisar de los clientes ganados (anticipo sin pagar, pagos vencidos…)
  const alerts = await loadAlerts(prospects);
  return NextResponse.json(prospects.map((p) => ({ ...p, alerts: alerts.get(p.id) ?? [] })));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = pickProspectFields(body);
  if (!data.brandName) {
    return NextResponse.json({ error: "Falta el nombre de la marca" }, { status: 400 });
  }
  const prospect = await prisma.prospect.create({
    data: data as { brandName: string },
    include: { quotes: { select: QUOTE_SUMMARY_SELECT } },
  });
  return NextResponse.json(prospect, { status: 201 });
}
