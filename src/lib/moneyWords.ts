// Monto con letra para recibos: 18000 → "Dieciocho mil pesos 00/100 M.N."
const UNITS = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = HUNDREDS[h];
  if (rest > 0) {
    const words = rest < 30 ? UNITS[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? ` y ${UNITS[rest % 10]}` : ""}`;
    out = `${out} ${words}`.trim();
  }
  return out;
}

// "uno" se apocopa delante de mil/millones/pesos: "veintiún mil", "un millón"
const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

export function numberToWords(n: number): string {
  if (n === 0) return "cero";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "un millón" : `${apocope(numberToWords(millions))} millones`);
  if (thousands) parts.push(thousands === 1 ? "mil" : `${apocope(below1000(thousands))} mil`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

export function amountInWords(amount: number): string {
  const pesos = Math.floor(amount + 1e-9);
  const cents = Math.round((amount - pesos) * 100);
  let words = numberToWords(pesos);
  if (/(^|\s)uno$/.test(words) || /veintiuno$/.test(words)) words = apocope(words);
  if (/(millón|millones)$/.test(words)) words += " de";
  const text = `${words} ${pesos === 1 ? "peso" : "pesos"} ${String(cents).padStart(2, "0")}/100 M.N.`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
