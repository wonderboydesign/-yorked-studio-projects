// Días festivos en México (fechas en medianoche UTC, como el resto de la app)
// - Descanso obligatorio (Ley Federal del Trabajo, art. 74): 1 de enero,
//   primer lunes de febrero, tercer lunes de marzo, 1 de mayo, 16 de
//   septiembre, 1 de octubre cada seis años (cambio de Poder Ejecutivo,
//   2030, 2036…), tercer lunes de noviembre y 25 de diciembre.
// - Jueves y Viernes Santo: no son obligatorios por ley, pero casi todos los
//   clientes y proveedores paran, así que tampoco se calendarizan.

const key = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

// n-ésimo lunes del mes (n = 1, 2, 3…)
function nthMonday(year: number, month: number, n: number) {
  const first = utc(year, month, 1);
  const offset = (8 - first.getUTCDay()) % 7; // días hasta el primer lunes
  return utc(year, month, 1 + offset + (n - 1) * 7);
}

// Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano)
function easter(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

const cache = new Map<number, Map<string, string>>();

export function holidaysOf(year: number): Map<string, string> {
  const hit = cache.get(year);
  if (hit) return hit;
  const sunday = easter(year);
  const list: [Date, string][] = [
    [utc(year, 1, 1), "Año Nuevo"],
    [nthMonday(year, 2, 1), "Día de la Constitución"],
    [nthMonday(year, 3, 3), "Natalicio de Benito Juárez"],
    [new Date(sunday.getTime() - 3 * 86400000), "Jueves Santo"],
    [new Date(sunday.getTime() - 2 * 86400000), "Viernes Santo"],
    [utc(year, 5, 1), "Día del Trabajo"],
    [utc(year, 9, 16), "Día de la Independencia"],
    [nthMonday(year, 11, 3), "Día de la Revolución"],
    [utc(year, 12, 25), "Navidad"],
  ];
  if (year >= 2024 && (year - 2024) % 6 === 0) list.push([utc(year, 10, 1), "Cambio de Poder Ejecutivo"]);
  const map = new Map(list.map(([d, name]) => [key(d), name]));
  cache.set(year, map);
  return map;
}

// Nombre del festivo, o null si es día normal
export function holidayName(d: Date): string | null {
  return holidaysOf(d.getUTCFullYear()).get(key(d)) ?? null;
}
