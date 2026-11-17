import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PHASES } from "@/lib/quotes";
import { parseWeeks, phaseNotes, phaseTaskName, planPhases } from "@/lib/schedule";
import { phaseOf } from "@/lib/portal";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

// Fases del portal sin pasar por cotización (proyectos que ya iban en curso o
// terminados): se crean con la plantilla del estudio, sin asignar.
// { action: "complete" } marca todas las fases del proyecto como terminadas.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  if (body.action === "complete") {
    const tasks = await prisma.task.findMany({ where: { projectId: project.id }, select: { id: true, name: true, status: true, startDate: true, endDate: true, phase: true } });
    const ids = tasks.filter((t) => phaseOf(t)).map((t) => t.id);
    await prisma.task.updateMany({ where: { id: { in: ids } }, data: { status: "DONE" } });
    return NextResponse.json({ updated: ids.length });
  }

  const startDate = typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? body.startDate : null;
  if (!startDate) return NextResponse.json({ error: "Falta la fecha de inicio" }, { status: 400 });
  const wanted: { number: string; weeks?: number; status?: string }[] = Array.isArray(body.phases) ? body.phases : [];
  const chosen = DEFAULT_PHASES.filter((ph) => wanted.some((w) => String(w.number) === ph.number));
  if (chosen.length === 0) return NextResponse.json({ error: "Elige al menos una fase" }, { status: 400 });

  const conf = (n: string) => wanted.find((w) => String(w.number) === n)!;
  const plan = planPhases(
    chosen,
    chosen.map((ph) => Number(conf(ph.number).weeks) || parseWeeks(ph.duration)),
    new Date(`${startDate}T00:00:00Z`)
  );
  const first = plan[0].start;
  const last = plan[plan.length - 1].end;

  await prisma.$transaction([
    ...plan.map((p) => {
      const st = conf(p.phase.number).status;
      return prisma.task.create({
        data: {
          name: phaseTaskName(p.phase, project.name),
          phase: p.phase.number,
          projectId: project.id,
          startDate: p.start,
          endDate: p.end,
          status: STATUSES.includes(st as (typeof STATUSES)[number]) ? (st as (typeof STATUSES)[number]) : "TODO",
          notes: phaseNotes(p.phase, project.name),
        },
      });
    }),
    prisma.project.update({
      where: { id: project.id },
      data: {
        startDate: project.startDate < first ? project.startDate : first,
        endDate: project.endDate > last ? project.endDate : last,
      },
    }),
  ]);
  return NextResponse.json({ created: plan.length }, { status: 201 });
}
