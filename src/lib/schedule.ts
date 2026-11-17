import { QuoteContent, QuotePhase } from "./quotes";
import { addDays } from "./date";
import { holidayName } from "./holidays";

// Calendarizar un proyecto ganado: cada fase de la propuesta se vuelve una
// tarea sin asignar, una tras otra, de lunes a viernes. Se usa igual en el
// navegador (vista previa) y en el servidor (al crear las tareas).

// "1 semana" → 1, "2 – 3 semanas" → 3 (el rango largo, para no quedarse
// cortos), "10 días" → 2, "3 días" → 1. Sin número, 1 semana.
export function parseWeeks(duration: string): number {
  const nums = (duration.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", ".")));
  if (nums.length === 0) return 1;
  const max = Math.max(...nums);
  if (/d[ií]a/i.test(duration)) return Math.max(1, Math.ceil(max / 5));
  return Math.max(1, Math.ceil(max));
}

// Las fases que incluye la opción aprobada ("Fase 01 + 02 + 03"); si no se
// puede leer, todas
export function phasesForOption(content: QuoteContent, optionKey?: string | null): QuotePhase[] {
  const option =
    content.options.find((o) => o.key === optionKey) ?? content.options.find((o) => o.recommended) ?? content.options[0];
  const numbers = (option?.phases.match(/\d+/g) ?? []).map((n) => Number(n));
  const picked = content.phases.filter((ph) => numbers.includes(Number(ph.number)));
  return picked.length > 0 ? picked : content.phases;
}

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

// Día hábil: ni fin de semana ni festivo (ver src/lib/holidays.ts)
export const isWorkday = (d: Date) => !isWeekend(d) && !holidayName(d);

export function nextWorkday(d: Date): Date {
  let x = d;
  while (!isWorkday(x)) x = addDays(x, 1);
  return x;
}

export interface PlannedPhase {
  phase: QuotePhase;
  weeks: number;
  start: Date;
  end: Date;
  // Festivos que caen dentro de la fase (no cuentan como días de trabajo)
  holidays: { date: Date; name: string }[];
}

// Fechas en medianoche UTC, como el resto de la app. Cada semana son 5 días
// hábiles: los fines de semana y festivos no cuentan, y una fase nunca
// empieza ni termina en uno; si cae un festivo en medio, la fase se alarga
// un día. La siguiente arranca el siguiente día hábil.
export function planPhases(phases: QuotePhase[], weeks: number[], start: Date): PlannedPhase[] {
  let cursor = nextWorkday(start);
  return phases.map((phase, i) => {
    const w = Math.max(1, Math.min(52, Math.round(weeks[i] ?? parseWeeks(phase.duration))));
    const s = cursor;
    let e = s;
    const holidays: PlannedPhase["holidays"] = [];
    for (let worked = 1; worked < w * 5; ) {
      e = addDays(e, 1);
      if (isWorkday(e)) worked++;
      else if (!isWeekend(e)) holidays.push({ date: e, name: holidayName(e)! });
    }
    cursor = nextWorkday(addDays(e, 1));
    return { phase, weeks: w, start: s, end: e, holidays };
  });
}

// Notas de la tarea: la descripción de la fase y sus entregables como lista
// de pendientes, para irlos palomeando
export function phaseNotes(phase: QuotePhase, brandName: string): string {
  return [
    `${phase.subtitle ? `**${phase.subtitle}** · ` : ""}${brandName}`,
    phase.description,
    phase.items.map((it) => `- [ ] ${it}`).join("\n"),
  ]
    .filter((x) => x?.trim())
    .join("\n\n");
}

// Con la marca al inicio, para distinguirla en el calendario general
export function phaseTaskName(phase: QuotePhase, brandName: string) {
  return `${brandName} · Fase ${phase.number} ${phase.name}`;
}
