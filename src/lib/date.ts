export function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

// Devuelve el día calendario de HOY tal como lo vive el usuario en su
// zona horaria local, normalizado a medianoche UTC (igual que el resto
// de las fechas en la app). Nunca usar `new Date()` directamente para
// representar "hoy": su hora UTC puede caer en el día siguiente para
// usuarios en zonas horarias detrás de UTC (ej. Ciudad de México), sobre
// todo por la noche.
export function localToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function parseDate(s: string): Date {
  return new Date(s + (s.length === 10 ? "T00:00:00" : ""));
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

export function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCMonth(copy.getUTCMonth() + n);
  return copy;
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(copy, diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function startOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

export function daysBetween(a: Date, b: Date): number {
  const ms = 1000 * 60 * 60 * 24;
  return Math.round(
    (Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
     Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) /
    ms
    );
}

export function formatShort(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function formatLong(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function capMonth(s: string): string {
  return s.replace(/\b([a-záéíóúñ])/i, (m) => m.toUpperCase());
}

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

export const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
