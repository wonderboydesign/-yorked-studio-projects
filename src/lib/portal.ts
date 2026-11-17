import { addDays } from "./date";
import { QuoteContent } from "./quotes";
import { isWorkday } from "./schedule";

// Portal del cliente: avance del proyecto a partir de sus tareas y pagos.
// Se usa en el portal público (/c/<token>) y en el panel del estudio.

export interface PortalTask {
  name: string;
  status: string; // TODO | IN_PROGRESS | IN_REVIEW | DONE
  startDate: Date | string;
  endDate: Date | string;
  phase?: string | null;
}

export type PhaseState = "done" | "active" | "upcoming";

export interface PortalPhase {
  number: string;
  name: string;
  start: Date;
  end: Date;
  state: PhaseState;
  percent: number;
}

export interface Progress {
  percent: number;
  phases: PortalPhase[];
  start: Date | null;
  end: Date | null;
}

export interface PaymentRow {
  id: string;
  label: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  withIva: boolean;
  order: number;
}

const asDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

function workdays(start: Date, end: Date) {
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkday(d)) n++;
  return Math.max(1, n);
}

// Las fases son las tareas creadas al calendarizar (campo phase) o, en las
// que se crearon antes, las que se llaman "… Fase 02 Nombre"
const PHASE_NAME = /(?:^|·\s*)Fase\s+(\d{1,2})\s*[·:-]?\s*(.*)$/i;

export function phaseOf(task: PortalTask): { number: string; name: string } | null {
  const m = task.name.match(PHASE_NAME);
  if (task.phase) return { number: task.phase, name: m?.[2]?.trim() || task.name };
  if (!m) return null;
  return { number: m[1].padStart(2, "0"), name: m[2].trim() || `Fase ${m[1]}` };
}

// Qué tanto lleva una tarea: terminada 100%; en curso, según los días hábiles
// que han pasado (entre 5% y 85%, para no prometer de más); en revisión, al
// menos 85%; sin empezar, 0
function taskFraction(task: PortalTask, today: Date): { state: PhaseState; fraction: number } {
  const start = asDate(task.startDate);
  const end = asDate(task.endDate);
  if (task.status === "DONE") return { state: "done", fraction: 1 };
  const started = task.status === "IN_PROGRESS" || task.status === "IN_REVIEW" || today >= start;
  if (!started) return { state: "upcoming", fraction: 0 };
  const elapsed = today < start ? 0 : workdays(start, today > end ? end : today) / workdays(start, end);
  let fraction = Math.min(0.85, Math.max(0.05, elapsed));
  if (task.status === "IN_REVIEW") fraction = Math.max(fraction, 0.85);
  return { state: "active", fraction };
}

// Avance total ponderado por duración (una fase de 3 semanas pesa el triple
// que una de 1). Si el proyecto tiene fases, cuentan solo las fases; si no,
// todas sus tareas.
export function computeProgress(tasks: PortalTask[], today: Date): Progress {
  const withPhase = tasks.map((t) => ({ t, ph: phaseOf(t) }));
  const phaseTasks = withPhase.filter((x) => x.ph);
  const counted = phaseTasks.length > 0 ? phaseTasks.map((x) => x.t) : tasks;

  let total = 0;
  let done = 0;
  for (const t of counted) {
    const w = workdays(asDate(t.startDate), asDate(t.endDate));
    total += w;
    done += w * taskFraction(t, today).fraction;
  }

  const phases = phaseTasks
    .map(({ t, ph }) => {
      const f = taskFraction(t, today);
      return {
        number: ph!.number,
        name: ph!.name,
        start: asDate(t.startDate),
        end: asDate(t.endDate),
        state: f.state,
        percent: Math.round(f.fraction * 100),
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.number.localeCompare(b.number));

  const dates = counted.flatMap((t) => [asDate(t.startDate), asDate(t.endDate)]);
  return {
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
    phases,
    start: dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
    end: dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
  };
}

// Pagos iniciales a partir de la propuesta aprobada: anticipo al aprobar y
// finiquito al terminar la última fase
export function paymentsFromQuote(
  content: QuoteContent,
  optionKey: string | null,
  approvedAt: Date | null,
  lastEnd: Date | null
): { label: string; amount: number; dueDate: Date | null; order: number }[] {
  const option =
    content.options.find((o) => o.key === optionKey) ?? content.options.find((o) => o.recommended) ?? content.options[0];
  if (!option) return [];
  const adv = Math.min(100, Math.max(0, content.advancePercent ?? 50));
  const advance = Math.round((option.price * adv) / 100);
  const rows = [{ label: `Anticipo ${adv}%`, amount: advance, dueDate: approvedAt, order: 1 }];
  if (adv < 100) rows.push({ label: `Finiquito ${100 - adv}%`, amount: option.price - advance, dueDate: lastEnd, order: 2 });
  return rows;
}

export const IVA_RATE = 0.16;

// Lo que el cliente paga: el monto del pago, con IVA si el proyecto lo lleva
export function clientAmount(amount: number, withIva: boolean) {
  return Math.round(amount * (withIva ? 1 + IVA_RATE : 1) * 100) / 100;
}

// Reparte un precio nuevo entre los pagos pendientes, en la misma proporción
// que tenían (los pagados no se tocan). Montos en pesos enteros; el último
// pendiente absorbe el redondeo.
export function redistribute(
  payments: { id: string; amount: number; paid: boolean }[],
  total: number
): { id: string; amount: number }[] {
  const paidSum = payments.filter((p) => p.paid).reduce((n, p) => n + p.amount, 0);
  const pending = payments.filter((p) => !p.paid);
  if (pending.length === 0) return [];
  const remaining = Math.max(0, total - paidSum);
  const base = pending.reduce((n, p) => n + p.amount, 0);
  let assigned = 0;
  return pending.map((p, i) => {
    const amount =
      i === pending.length - 1
        ? Math.round((remaining - assigned) * 100) / 100
        : Math.round(base > 0 ? (remaining * p.amount) / base : remaining / pending.length);
    assigned += amount;
    return { id: p.id, amount };
  });
}
