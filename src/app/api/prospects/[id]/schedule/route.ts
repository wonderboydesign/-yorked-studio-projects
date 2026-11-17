import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { QUOTE_SUMMARY_SELECT } from "@/lib/quotesServer";
import { ensurePayments } from "@/lib/portalServer";
import { QuoteContent } from "@/lib/quotes";
import { parseWeeks, phaseNotes, phaseTaskName, phasesForOption, planPhases } from "@/lib/schedule";

const COLORS = ["#1E4FFF", "#0F9D58", "#F4511E", "#8E24AA", "#00897B", "#E91E63", "#5D4037"];

// Manda las fases de la propuesta aprobada al calendario como tareas sin
// asignar, dentro del proyecto del cliente (se crea si no existe)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const startDate = typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? body.startDate : null;
  if (!startDate) return NextResponse.json({ error: "Falta la fecha de inicio" }, { status: 400 });

  const prospect = await prisma.prospect.findUnique({ where: { id: params.id } });
  if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 });

  const quote = await prisma.quote.findFirst({
    where: { prospectId: prospect.id, ...(typeof body.quoteId === "string" ? { id: body.quoteId } : {}) },
    orderBy: [{ approvedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  if (!quote) return NextResponse.json({ error: "Este prospecto no tiene cotización con fases" }, { status: 400 });

  const content = quote.content as unknown as QuoteContent;
  const phases = phasesForOption(content, quote.approvedOption);
  if (phases.length === 0) return NextResponse.json({ error: "La cotización no tiene fases" }, { status: 400 });

  // Solo las fases que se marcaron en la vista previa (por número)
  const include: string[] | null = Array.isArray(body.phases) ? body.phases.map(String) : null;
  const chosen = include ? phases.filter((ph) => include.includes(ph.number)) : phases;
  if (chosen.length === 0) return NextResponse.json({ error: "Elige al menos una fase" }, { status: 400 });
  const weeks = chosen.map((ph) => {
    const w = Number(body.weeks?.[ph.number]);
    return w > 0 ? w : parseWeeks(ph.duration);
  });
  const plan = planPhases(chosen, weeks, new Date(`${startDate}T00:00:00Z`));
  const first = plan[0].start;
  const last = plan[plan.length - 1].end;

  // Proyecto: el que se eligió, el ligado al prospecto o uno nuevo
  const projectId: string | null =
    typeof body.projectId === "string" && body.projectId ? body.projectId : body.projectId === null ? null : prospect.projectId;
  let project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;
  if (projectId && !project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const created = await prisma.$transaction(async (tx) => {
    if (!project) {
      const count = await tx.project.count();
      project = await tx.project.create({
        data: {
          name: prospect.brandName,
          client: prospect.contact ? `${prospect.brandName} · ${prospect.contact}` : prospect.brandName,
          color: COLORS[count % COLORS.length],
          startDate: first,
          endDate: last,
        },
      });
    } else {
      // El proyecto se amplía para que quepan las fases
      await tx.project.update({
        where: { id: project.id },
        data: {
          startDate: project.startDate < first ? project.startDate : first,
          endDate: project.endDate > last ? project.endDate : last,
          archived: false,
        },
      });
    }
    const tasks = [];
    for (const p of plan) {
      tasks.push(
        await tx.task.create({
          data: {
            name: phaseTaskName(p.phase, prospect.brandName),
            phase: p.phase.number,
            projectId: project.id,
            startDate: p.start,
            endDate: p.end,
            status: "TODO",
            notes: phaseNotes(p.phase, prospect.brandName),
          },
        })
      );
    }
    await tx.prospect.update({
      where: { id: prospect.id },
      data: { projectId: project.id, scheduledAt: new Date() },
    });
    return tasks;
  });

  // Anticipo y finiquito para el portal del cliente, si aún no hay pagos
  await ensurePayments(project!.id);

  const updated = await prisma.prospect.findUnique({
    where: { id: prospect.id },
    include: { quotes: { select: QUOTE_SUMMARY_SELECT, orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json({ prospect: updated, projectId: project!.id, tasks: created.length }, { status: 201 });
}
