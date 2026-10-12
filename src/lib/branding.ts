// Flujo de branding: seis etapas en orden. Cada etapa tiene un objetivo y
// una salida concreta; la siguiente etapa parte de lo que dejó la anterior.

export type BrandStage = "brief" | "concept" | "research" | "moodboard" | "development" | "presentation";

export const BRAND_STAGES: {
  key: BrandStage;
  number: string;
  label: string;
  goal: string;
  output: string;
}[] = [
  {
    key: "brief",
    number: "01",
    label: "Brief",
    goal: "Reunir todo lo que llega del cliente: brief, comentarios y contexto.",
    output: "Brief principal limpio y completo.",
  },
  {
    key: "concept",
    number: "02",
    label: "Concepto",
    goal: "Bajar el brief a una dirección conceptual, con referencias y conceptos propuestos.",
    output: "1 a 3 conceptos elegidos para explorar.",
  },
  {
    key: "research",
    number: "03",
    label: "Investigación",
    goal: "Investigar negocio, audiencia, competencia y categoría, y aterrizarlo en hallazgos y un plano general.",
    output: "Hallazgos, mapa de posicionamiento y plano general.",
  },
  {
    key: "moodboard",
    number: "04",
    label: "Moodboard",
    goal: "Traducir cada concepto a una dirección visual con imágenes de referencia.",
    output: "Un moodboard por dirección visual.",
  },
  {
    key: "development",
    number: "05",
    label: "Desarrollo",
    goal: "Subir bocetos y piezas desarrolladas, y marcar qué pasa a presentación.",
    output: "Piezas en estado “Para presentar”.",
  },
  {
    key: "presentation",
    number: "06",
    label: "Presentación",
    goal: "Armar la secuencia de láminas y presentar o exportar a PDF.",
    output: "Presentación lista para el cliente.",
  },
];

export interface BrandWorkspace {
  id: string;
  projectId: string;
  stage: BrandStage;
  brief: string | null;
  context: string | null;
  conceptNotes: string | null;
  plan: string | null;
  research: BrandResearch | null;
  updatedAt: string;
}

// Research estructurado: un texto por bloque, ejes del mapa de
// posicionamiento y el lugar que buscamos para la marca en ese mapa
export interface BrandResearch {
  blocks?: Partial<Record<ResearchBlockKey, string>>;
  axes?: { xLeft: string; xRight: string; yBottom: string; yTop: string };
  target?: { x: number; y: number } | null;
}

export type ResearchBlockKey = "business" | "audience" | "category" | "trends";

export const RESEARCH_BLOCKS: { key: ResearchBlockKey; label: string; hint: string; placeholder: string }[] = [
  {
    key: "business",
    label: "Negocio",
    hint: "Qué vende, cómo gana dinero, qué lo hace distinto y a dónde quiere llegar.",
    placeholder: "Oferta: …\nModelo de negocio: …\nDiferenciadores reales: …\nObjetivos a 1–3 años: …",
  },
  {
    key: "audience",
    label: "Audiencia",
    hint: "2 o 3 perfiles: quiénes son, qué les importa y dónde se encuentran con la marca.",
    placeholder: "Perfil 1 — …\nQué busca: …\nQué le molesta: …\nDónde ve la marca: …",
  },
  {
    key: "category",
    label: "Categoría",
    hint: "Los códigos que todos repiten en este giro (color, tipografía, tono, imágenes). ¿Seguirlos o romperlos?",
    placeholder: "Colores típicos: …\nTipografías típicas: …\nTono típico: …\nLo que nadie está haciendo: …",
  },
  {
    key: "trends",
    label: "Tendencias",
    hint: "Movimientos de mercado, culturales o visuales que le afectan o que puede aprovechar.",
    placeholder: "Tendencia — por qué importa — fuente",
  },
];

export const DEFAULT_AXES = { xLeft: "Accesible", xRight: "Premium", yBottom: "Tradicional", yTop: "Moderno" };

// Campos de un competidor (BrandItem kind "competitor", en data)
export interface CompetitorData {
  colors?: string;
  typography?: string;
  tone?: string;
  price?: string;
  x?: number;
  y?: number;
}

// Hallazgo: Encontramos → Significa → Oportunidad (BrandItem kind "insight")
export interface InsightData {
  found?: string;
  means?: string;
  opportunity?: string;
}

export type BrandTextField = "brief" | "context" | "conceptNotes" | "plan";

// Tipos de pieza por etapa
export type BrandItemKind =
  | "comment" // brief: comentario del cliente o interno
  | "file" // cualquier etapa: archivo adjunto
  | "reference" // concepto: referencia (imagen o liga)
  | "concept" // concepto: concepto propuesto (a mano o con IA)
  | "idea" // investigación: idea
  | "image" // moodboard: imagen
  | "piece" // desarrollo: boceto o pieza desarrollada
  | "competitor" // investigación: ficha de competidor
  | "insight"; // investigación: hallazgo

export interface BrandItem {
  id: string;
  projectId: string;
  section: BrandStage;
  kind: BrandItemKind;
  title: string | null;
  body: string | null;
  url: string | null;
  pathname: string | null;
  contentType: string | null;
  linkUrl: string | null;
  status: string | null;
  data: Record<string, unknown> | null;
  pinned: boolean;
  aiGenerated: boolean;
  order: number;
  boardId: string | null;
  referenceId: string | null;
  authorId: string | null;
  author?: { id: string; name: string } | null;
  createdAt: string;
}

export interface Moodboard {
  id: string;
  projectId: string;
  name: string;
  notes: string | null;
  createdAt: string;
}

export interface Reference {
  id: string;
  title: string | null;
  url: string;
  pathname: string | null;
  sourceUrl: string | null;
  tags: string[];
  notes: string | null;
  createdAt: string;
  external?: boolean;
}

export type BrandSlideType = "cover" | "section" | "text" | "image" | "moodboard" | "concept" | "insights" | "map";

export interface BrandSlide {
  id: string;
  type: BrandSlideType;
  title?: string;
  body?: string;
  // Piezas (BrandItem) que muestra la lámina: imagen, concepto…
  itemIds?: string[];
  // Para láminas de moodboard
  boardId?: string;
}

export interface Presentation {
  id: string;
  projectId: string;
  title: string;
  slides: BrandSlide[];
  updatedAt: string;
}

export interface BrandData {
  workspace: BrandWorkspace;
  items: BrandItem[];
  moodboards: Moodboard[];
  presentations: Presentation[];
}

export const IDEA_STATUSES = [
  { key: "explore", label: "Explorar" },
  { key: "develop", label: "Desarrollar" },
  { key: "discarded", label: "Descartada" },
] as const;

export const PIECE_STATUSES = [
  { key: "sketch", label: "Boceto" },
  { key: "proposal", label: "Propuesta" },
  { key: "present", label: "Para presentar" },
  { key: "final", label: "Final" },
] as const;

export const CONCEPT_STATUSES = [
  { key: "proposed", label: "Propuesto" },
  { key: "chosen", label: "Elegido" },
  { key: "discarded", label: "Descartado" },
] as const;

export function isImage(contentType: string | null | undefined, url?: string | null) {
  if (contentType?.startsWith("image/")) return true;
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(url);
}

export function newSlideId() {
  return Math.random().toString(36).slice(2, 10);
}
