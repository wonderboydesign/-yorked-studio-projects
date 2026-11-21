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
  method: string;
  methodChosenAt: string | null;
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

// Contraste (WCAG) para escoger el color del texto según el fondo
function rgbOf(hex: string): [number, number, number] | null {
  const h = (hex ?? "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return rgb.some((n) => Number.isNaN(n)) ? null : (rgb as [number, number, number]);
}

function luminance([r, g, b]: [number, number, number]) {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// Texto de los botones sobre el color de acento: blanco o negro, el que más
// contraste le dé (en colores medios, como un verde, gana el negro)
export function isDarkColor(hex: string) {
  const rgb = rgbOf(hex);
  if (!rgb) return true;
  return luminance(rgb) < 0.179;
}

// Fondo oscuro garantizado para secciones con texto claro (#f1efe9): si el
// color elegido es demasiado claro, se oscurece hasta que el texto se lea (≥ 4.5:1, también con textos al 65%)
export function readableDark(hex: string, fallback = "#121210") {
  const rgb = rgbOf(hex);
  if (!rgb) return fallback;
  let [r, g, b] = rgb;
  for (let i = 0; i < 20 && luminance([r, g, b]) > 0.05; i++) {
    r = Math.round(r * 0.88);
    g = Math.round(g * 0.88);
    b = Math.round(b * 0.88);
  }
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Color de acento usado COMO TEXTO sobre un fondo claro u oscuro: si no da el
// contraste mínimo (4.5:1), se oscurece (fondo claro) o se aclara (fondo oscuro)
// hasta que se lea. Conserva el tono del color en lo posible.
export function accentInk(hex: string, background: string) {
  const rgb = rgbOf(hex);
  const bg = rgbOf(background);
  if (!rgb || !bg) return hex;
  const lb = luminance(bg);
  const ratio = (c: [number, number, number]) => {
    const l = luminance(c);
    return (Math.max(l, lb) + 0.05) / (Math.min(l, lb) + 0.05);
  };
  const toward = lb > 0.4 ? 0 : 255;
  let c: [number, number, number] = rgb;
  for (let i = 0; i < 40 && ratio(c) < 4.5; i++) {
    c = c.map((v) => Math.round(v + (toward - v) * 0.1)) as [number, number, number];
  }
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
