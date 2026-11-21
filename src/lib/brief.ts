// Brief del cliente: formulario propio dentro del portal. Las preguntas son
// editables por proyecto; las respuestas se guardan por id de pregunta.

export type BriefQuestionType = "short" | "long" | "choice" | "multi";

export interface BriefQuestion {
  id: string;
  section: string;
  label: string;
  help?: string;
  type: BriefQuestionType;
  options?: string[];
  required?: boolean;
  // Pregunta sugerida (no estaba en el formulario original): se puede quitar
  suggested?: boolean;
}

export type BriefAnswers = Record<string, string | string[]>;

export const BRIEF_TYPE_LABELS: Record<BriefQuestionType, string> = {
  short: "Respuesta corta",
  long: "Respuesta larga",
  choice: "Elegir una opción",
  multi: "Elegir varias opciones",
};

const MEDIA = ["Instagram", "TikTok", "Facebook", "Sitio web", "Google Maps", "Local físico", "Packaging", "Colaboraciones", "Eventos", "Merchandising", "Otro"];
const PERIPHERALS = ["Papelería (tarjetas, hoja membretada)", "Vasos y empaques", "Menú y señalética", "Uniformes", "Redes sociales", "Merchandising", "Sitio web", "Presentaciones", "Otro"];

type Q = Omit<BriefQuestion, "id">;
const TEMPLATE: Q[] = [
  { section: "Tú y tu marca", label: "¿Cuál es tu nombre?", type: "short", required: true },
  { section: "Tú y tu marca", label: "Correo electrónico", type: "short", required: true },
  { section: "Tú y tu marca", label: "WhatsApp o teléfono de contacto", type: "short", suggested: true },
  { section: "Tú y tu marca", label: "¿Cuál es el nombre de tu empresa o marca?", type: "short", required: true },
  { section: "Tú y tu marca", label: "¿Dónde está tu negocio?", help: "Ciudad y país, y si piensas expandirte a otros lugares.", type: "short", suggested: true },
  { section: "Tú y tu marca", label: "¿Por qué nace tu empresa? ¿Cuáles son tus influencias e inspiraciones?", type: "long" },
  { section: "Tú y tu marca", label: "Describe detalladamente tus productos y servicios", type: "long" },
  { section: "Tú y tu marca", label: "Si tu empresa fuera una persona, ¿cómo sería?", help: "Es la personalidad de tu marca.", type: "long" },

  { section: "Visión", label: "¿Cuáles son las metas a largo plazo de tu empresa?", type: "long" },
  { section: "Visión", label: "¿Cuáles son los 3 a 5 valores que guían a tu marca?", type: "short", suggested: true },
  { section: "Visión", label: "¿Qué quieres lograr con tu imagen?", type: "long" },
  { section: "Visión", label: "¿Qué te hace diferente? Menciona el valor agregado de tu producto o servicio", help: "Lo que te hace distinto de los demás.", type: "long" },

  { section: "Tu cliente y tu competencia", label: "¿Cuál es tu mercado meta?", help: "Edad, sexo, nivel socioeconómico, ocupación, ubicación, intereses y hábitos de consumo.", type: "long" },
  { section: "Tu cliente y tu competencia", label: "¿Quiénes son tus principales competidores?", type: "long" },
  { section: "Tu cliente y tu competencia", label: "Links de tu competencia directa, nacional e internacional (si existe)", type: "long" },

  { section: "Estilo", label: "¿Tienes algún estilo particular en mente para tu marca?", type: "long" },
  { section: "Estilo", label: "¿Tienes alguna preferencia de color?", type: "short" },
  { section: "Estilo", label: "¿Hay algún color que no quieras que se use en el diseño?", type: "short" },
  { section: "Estilo", label: "¿Qué adjetivos describen mejor a tu marca?", help: "Por ejemplo cinco palabras, una por línea.", type: "long" },
  { section: "Estilo", label: "Si tu marca se comparara con una marca famosa, ¿cuál sería?", help: "Por ejemplo Apple, Google o Coca-Cola.", type: "long" },
  { section: "Estilo", label: "¿Qué mensaje o sensación quieres que tu imagen deje en el público?", type: "long" },
  { section: "Estilo", label: "¿Qué NO quieres que parezca o transmita tu marca?", help: "Estilos, marcas o sensaciones que quieres evitar.", type: "long", suggested: true },
  { section: "Estilo", label: "Links a imágenes o marcas que te resulten atractivas", type: "long" },
  { section: "Estilo", label: "¿Ya tienes logo o identidad? ¿Qué conservarías y qué cambiarías?", type: "long", suggested: true },
  { section: "Estilo", label: "¿Tienes un eslogan o frase que ya uses?", type: "short", suggested: true },

  { section: "Alcance y tiempos", label: "¿En qué medios tendrá presencia tu marca?", type: "multi", options: MEDIA },
  { section: "Alcance y tiempos", label: "¿Qué periféricos de marca son fundamentales diseñar para tu proyecto?", type: "multi", options: PERIPHERALS },
  { section: "Alcance y tiempos", label: "¿Tienes una fecha de lanzamiento o un evento clave?", type: "short", suggested: true },
  { section: "Alcance y tiempos", label: "¿Quién toma las decisiones y aprueba el trabajo?", type: "short", suggested: true },
  { section: "Alcance y tiempos", label: "¿Qué rango de inversión tienes en mente?", type: "choice", options: ["Menos de $20,000", "$20,000 a $40,000", "$40,000 a $80,000", "Más de $80,000", "Prefiero platicarlo"], suggested: true },
  { section: "Alcance y tiempos", label: "¿Algo más que debamos saber?", type: "long", suggested: true },
];

export function newQuestionId() {
  return "q" + Math.random().toString(36).slice(2, 9);
}

export const DEFAULT_TITLE = "Sobre tu marca";
export const DEFAULT_INTRO = "Cuéntanos de tu marca con tus propias palabras. Mientras más detalle, mejor será el resultado. Se guarda automáticamente y puedes volver cuando quieras.";

export function defaultQuestions(): BriefQuestion[] {
  return TEMPLATE.map((q) => ({ ...q, id: newQuestionId() }));
}

const TYPES: BriefQuestionType[] = ["short", "long", "choice", "multi"];

// Limpia lo que llega del panel antes de guardarlo
export function sanitizeQuestions(input: unknown): BriefQuestion[] | null {
  if (!Array.isArray(input) || input.length > 80) return null;
  const seen = new Set<string>();
  const out: BriefQuestion[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const q = raw as Record<string, unknown>;
    const label = typeof q.label === "string" ? q.label.trim().slice(0, 300) : "";
    const type = TYPES.includes(q.type as BriefQuestionType) ? (q.type as BriefQuestionType) : "long";
    let id = typeof q.id === "string" && /^[a-z0-9_-]{2,20}$/i.test(q.id) ? q.id : newQuestionId();
    while (seen.has(id)) id = newQuestionId();
    seen.add(id);
    const options =
      type === "choice" || type === "multi"
        ? (Array.isArray(q.options) ? q.options : []).filter((o): o is string => typeof o === "string").map((o) => o.trim().slice(0, 100)).filter(Boolean).slice(0, 30)
        : undefined;
    out.push({
      id,
      section: typeof q.section === "string" ? q.section.trim().slice(0, 80) : "",
      label: label || "Pregunta sin título",
      help: typeof q.help === "string" && q.help.trim() ? q.help.trim().slice(0, 500) : undefined,
      type,
      options,
      required: q.required === true || undefined,
      suggested: q.suggested === true || undefined,
    });
  }
  return out;
}

// Limpia las respuestas del cliente: solo preguntas que existen, textos acotados
export function sanitizeAnswers(input: unknown, questions: BriefQuestion[]): BriefAnswers | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const out: BriefAnswers = {};
  for (const [id, value] of Object.entries(input as Record<string, unknown>)) {
    const q = byId.get(id);
    if (!q) continue;
    if (q.type === "multi") {
      if (!Array.isArray(value)) continue;
      out[id] = value.filter((v): v is string => typeof v === "string").map((v) => v.trim().slice(0, 200)).filter(Boolean).slice(0, 30);
    } else if (typeof value === "string") {
      out[id] = value.slice(0, 8000);
    }
  }
  return out;
}

export function hasAnswer(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.length > 0 : !!v && v.trim().length > 0;
}

export function answeredCount(questions: BriefQuestion[], answers: BriefAnswers) {
  return questions.filter((q) => hasAnswer(answers[q.id])).length;
}

export function missingRequired(questions: BriefQuestion[], answers: BriefAnswers) {
  return questions.filter((q) => q.required && !hasAnswer(answers[q.id]));
}

// Texto del brief (para copiarlo o pasarlo al Brief de Branding)
export function briefToText(title: string, questions: BriefQuestion[], answers: BriefAnswers) {
  const lines: string[] = [title.toUpperCase(), ""];
  let section = "";
  for (const q of questions) {
    const a = answers[q.id];
    if (!hasAnswer(a)) continue;
    if (q.section && q.section !== section) {
      section = q.section;
      lines.push(`— ${section} —`, "");
    }
    lines.push(q.label, Array.isArray(a) ? a.join(", ") : (a as string).trim(), "");
  }
  return lines.join("\n").trim();
}
