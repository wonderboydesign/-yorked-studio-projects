// Cotizaciones: estructura del contenido y plantillas por defecto, tomadas
// de las propuestas que el estudio ya envía (wonderboy.mx/propuestas/…).

export type ProspectStage = "new" | "quoted" | "negotiating" | "won" | "lost";

export const PROSPECT_STAGES: { key: ProspectStage; label: string }[] = [
  { key: "new", label: "Nuevo" },
  { key: "quoted", label: "Cotizado" },
  { key: "negotiating", label: "En negociación" },
  { key: "won", label: "Ganado" },
  { key: "lost", label: "Perdido" },
];

export type QuoteStatus = "draft" | "sent" | "viewed" | "approved" | "rejected";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  viewed: "Vista por el cliente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export interface Prospect {
  id: string;
  brandName: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  source: string | null;
  category: string | null;
  needs: string | null;
  budget: string | null;
  stage: ProspectStage;
  lostReason: string | null;
  notes: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  quotes?: QuoteSummary[];
}

export interface QuoteSummary {
  id: string;
  token: string;
  status: QuoteStatus;
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  approvedAt: string | null;
  approvedOption: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote extends QuoteSummary {
  prospectId: string;
  content: QuoteContent;
  approvedName: string | null;
  approvedEmail: string | null;
  approvedNote: string | null;
}

export interface QuotePhase {
  number: string; // "01"
  name: string; // "Brand Intelligence"
  subtitle: string; // "Briefing & Research"
  description: string;
  items: string[];
  duration: string; // "1 semana"
}

export interface QuoteOption {
  key: string; // "A"
  name: string; // "Identidad de Marca"
  phases: string; // "Fase 01 + 02 + 03 + 04"
  price: number; // MXN, sin IVA
  duration: string; // "5–6 semanas"
  features: string[];
  note: string; // "El alcance que recomendamos…"
  recommended: boolean;
}

export interface QuoteExtra {
  name: string;
  price: string; // texto libre: "$6,000 MXN + derechos"
}

export interface QuoteNote {
  title: string;
  body: string;
}

export interface QuoteContent {
  brandName: string; // "Matcha Bar"
  brandLine1: string; // primera línea del título grande: "Matcha"
  brandLine2: string; // segunda línea, en color de acento: "Bar."
  accent: string; // color de acento, ej. "#6f8f3f"
  dark: string; // fondo del cierre, ej. "#3d4c22"
  service: string; // "Brand System"
  summary: string; // "Diseño de identidad y sistema de marca para Matcha Bar."
  category: string; // "el matcha" — se usa en "En una categoría como …"
  touchpoints: string; // "en barra, en vaso, en empaque y en digital"
  issuedAt: string; // ISO de la fecha de emisión
  validDays: number;
  earlyDays: number;
  earlyDiscount: number; // %
  advancePercent: number; // anticipo, %
  weeks: string; // "6–7"
  phases: QuotePhase[];
  options: QuoteOption[];
  extras: QuoteExtra[];
  notes: QuoteNote[];
  visionPoints: string[];
  // Trabajos relacionados que muestra esta propuesta; vacío = todos
  workIds?: string[];
}

export interface StudioData {
  studioName: string;
  brandMark: string;
  city: string;
  whatsapp: string; // solo dígitos, con lada: 524428401937
  phoneLabel: string;
  emails: string[];
  instagram: string[];
  portfolioUrl: string;
  yearsOfPractice: number;
  bank: {
    bankName: string;
    holder: string;
    account: string;
    clabe: string;
    card: string;
    showCard: boolean;
  };
  // Tabulador base que Claude usa para sugerir alcance y precio
  pricing: string;
  works: StudioWork[];
}

// Trabajo del portafolio que se muestra en "Trabajos relacionados"
export interface StudioWork {
  id: string;
  name: string;
  city: string;
  year: string;
  tone: string; // color de fondo mientras no haya foto
  kind?: string; // "Identidad de marca", "Empaque"…
  image?: string; // render o foto (Vercel Blob)
  imagePath?: string;
  link?: string; // página del proyecto en el portafolio
}

export const DEFAULT_STUDIO: StudioData = {
  studioName: "Yorked Studio by Wonder Boy Design®",
  brandMark: "Wonder Boy",
  city: "Santiago de Querétaro",
  whatsapp: "524428401937",
  phoneLabel: "+52 (442) 840 1937",
  emails: ["hello@wonderboy.mx", "work@wonderboy.mx"],
  instagram: ["@wonderboydesign", "@yorkedstudio"],
  portfolioUrl: "https://wonderboy.mx/#design",
  yearsOfPractice: 10,
  bank: { bankName: "BBVA", holder: "", account: "", clabe: "", card: "", showCard: false },
  pricing: `Paquetes (MXN, sin IVA):
- Opción A — Logotipo Esencial (Fase 01 + 02, 3–4 semanas): $23,000. Investigación y briefing, logotipo y versiones, paleta y tipografía, mini guía de 4 páginas, archivos vectoriales. 1 ruta visual · 2 rondas de ajuste.
- Opción B — Identidad de Marca (Fase 01 + 02 + 03 + 04, 5–7 semanas): $25,000 a $36,000 según aplicaciones. Todo lo de A + gramática visual, aplicaciones principales (empaque o vasos, tarjeta, firma), social media kit en Canva, brandbook y brand portal. 2 rutas visuales · 2 rondas.
- Opción C — Sistema Completo (Fase 01–04 ampliado, 7–9 semanas): $62,000. Todo lo de B + empaque para 3 SKU, menú, señalética y rótulo, plantilla web en Figma, plantilla de presentación, brand portal activo. 3 rutas · 3 rondas.
Extras: SKU adicional $5,000 · Ilustración custom para etiqueta $7,000 · Naming y verificación $14,000 · Registro ante IMPI $6,000 + derechos · Ronda de refinamiento extra $2,500.
Pagos: 50% anticipo, 50% contraentrega. Vigencia 15 días; 5% de descuento si confirma en los primeros 7 días.`,
  works: [
    { id: "312-cafe-barra", name: "312 Café/Barra", city: "Tamaulipas", year: "2025", tone: "#dfe5cf" },
    { id: "koffein", name: "Koffein", city: "Querétaro", year: "2022", tone: "#2b2d2a" },
    { id: "casa-carmin", name: "Casa Carmín", city: "Querétaro", year: "2025", tone: "#e6ddd0" },
    { id: "punta-sirena", name: "Punta Sirena", city: "Acapulco, Gro.", year: "2023", tone: "#cbd6b3" },
    { id: "machete", name: "Machete", city: "Guatemala", year: "2025", tone: "#e8e5dd" },
  ],
};

export const DEFAULT_PHASES: QuotePhase[] = [
  {
    number: "01",
    name: "Brand Intelligence",
    subtitle: "Briefing & Research",
    description:
      "La base intelectual del proyecto. Antes de diseñar entendemos el contexto completo del negocio, su operación y su cliente objetivo, para asegurar que la marca sea un activo rentable y relevante.",
    items: [
      "Análisis del entorno: categoría y competencia",
      "Identificación de oportunidades estratégicas",
      "Definición de propósito, valores y posicionamiento",
      "Alineación de camino visual, briefing y moodboards",
    ],
    duration: "1 semana",
  },
  {
    number: "02",
    name: "Core Identity System",
    subtitle: "ADN visual",
    description:
      "Aquí se construye el lenguaje visual maestro: un sistema coherente, técnico y escalable, que permite que la marca sea reconocible incluso sin mostrar el logo.",
    items: [
      "Diseño del logotipo desde cero bajo principios de proporción y equilibrio",
      "Versiones, reducciones y usos permitidos",
      "Sistema tipográfico y cromático",
      "Gramática visual: patrones, texturas, elementos gráficos",
      "Lineamientos base para uso digital y físico",
    ],
    duration: "2 semanas",
  },
  {
    number: "03",
    name: "Experience & Brand Assets",
    subtitle: "Aplicaciones",
    description:
      "El sistema visual cobra vida. Traducimos la identidad maestra en herramientas de comunicación reales, asegurando que cada punto de contacto transmita la misma coherencia.",
    items: ["Aplicaciones principales de la marca", "Social media kit: plantillas editables en Canva"],
    duration: "2 – 3 semanas",
  },
  {
    number: "04",
    name: "Governance & Handover",
    subtitle: "Entrega, brand portal y manual",
    description:
      "No entregamos archivos sueltos. Entregamos una herramienta de gestión de marca que garantiza que la identidad pueda ser utilizada, replicada y cuidada por cualquier equipo o proveedor.",
    items: [
      "Brand portal con archivos finales entregables",
      "Lineamientos técnicos de implementación",
      "Brandbook / manual de identidad operativo",
      "Archivos editables y listos para imprenta",
    ],
    duration: "1 semana",
  },
];

export const DEFAULT_NOTES: QuoteNote[] = [
  {
    title: "Propiedad intelectual",
    body: "Una vez liquidado el 100% de la inversión, los derechos de uso de la identidad se transfieren íntegramente al cliente. Wonder Boy Design® se reserva el derecho de exhibir el proyecto en portafolios y plataformas de diseño.",
  },
  {
    title: "Vigencia",
    body: "Esta propuesta tiene una validez de {validDays} días naturales a partir de su emisión. Confirmando dentro de los primeros {earlyDays} días aplica un {earlyDiscount}% de descuento sobre el total.",
  },
  {
    title: "Pagos",
    body: "{advancePercent}% de anticipo para iniciar y {balancePercent}% contraentrega. Los costos no incluyen IVA; en caso de factura se suma el 16% correspondiente.",
  },
  {
    title: "Anticipo",
    body: "El pago inicial no es reembolsable, ya que asegura el espacio en la agenda estratégica del estudio y cubre la fase de Brand Intelligence.",
  },
  {
    title: "Insumos externos",
    body: "No se incluyen costos de producción física (imprenta, rotulación), licencias tipográficas de terceros, fotografía, video ni hosting. Cualquier gestión de proveedores externos se cotiza como consultoría adicional.",
  },
  {
    title: "Pausas y comunicación",
    body: "Cualquier falta de comunicación o materiales por parte del cliente que exceda los 30 días naturales causará la suspensión del proyecto y requerirá una actualización de costos para su reactivación.",
  },
  {
    title: "Archivos finales",
    body: "La entrega de archivos editables y de producción se realiza contra la liquidación total del proyecto.",
  },
  {
    title: "Alcance",
    body: "Cualquier pieza o aplicación fuera de lo listado en la inversión se cotiza por separado antes de iniciarse.",
  },
];

export const DEFAULT_EXTRAS: QuoteExtra[] = [
  { name: "Diseño de empaque por presentación (SKU) adicional", price: "$5,000 MXN" },
  { name: "Ilustración custom para etiqueta", price: "$7,000 MXN" },
  { name: "Naming y verificación de disponibilidad", price: "$14,000 MXN" },
  { name: "Gestión de registro de marca ante IMPI", price: "$6,000 MXN + derechos" },
  { name: "Ronda de refinamiento extra", price: "$2,500 MXN" },
];

export const DEFAULT_VISION_POINTS = [
  "Alinea visión, operación y comunicación",
  "Justifica el precio ante su cliente",
  "Se mantiene consistente sin volverse rígida",
  "Incrementa su valor con el tiempo",
];

// Divide "Matcha Bar" en dos líneas para el título grande: "Matcha" / "Bar."
export function splitBrand(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return [words[0], "."];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), `${words.slice(half).join(" ")}.`];
}

export function defaultContent(brandName: string, category?: string | null): QuoteContent {
  const [l1, l2] = splitBrand(brandName || "Nueva marca");
  return {
    brandName: brandName || "Nueva marca",
    brandLine1: l1,
    brandLine2: l2,
    accent: "#6f8f3f",
    dark: "#3d4c22",
    service: "Brand System",
    summary: `Diseño de identidad y sistema de marca para ${brandName || "tu marca"}.`,
    category: category?.trim() || "su categoría",
    touchpoints: "en punto de venta, en empaque y en digital",
    issuedAt: new Date().toISOString(),
    validDays: 15,
    earlyDays: 7,
    earlyDiscount: 5,
    advancePercent: 50,
    weeks: "6–7",
    phases: DEFAULT_PHASES.map((p) => ({ ...p, items: [...p.items] })),
    options: [
      {
        key: "A",
        name: "Identidad de Marca",
        phases: "Fase 01 + 02 + 03 + 04",
        price: 25000,
        duration: "6–7 semanas",
        features: [
          "Investigación y briefing estratégico",
          "Logotipo principal, versiones y reducciones",
          "Paleta cromática y sistema tipográfico",
          "Gramática visual: patrones y texturas",
          "Aplicaciones principales",
          "Social media kit editable en Canva",
          "Brandbook y brand portal de entrega",
          "2 rutas visuales · 2 rondas de ajuste",
        ],
        note: "",
        recommended: true,
      },
    ],
    extras: [],
    notes: DEFAULT_NOTES.map((n) => ({ ...n })),
    visionPoints: [...DEFAULT_VISION_POINTS],
  };
}

// Sustituye {validDays}, {advancePercent}… en los textos de notas
export function fillNote(text: string, c: QuoteContent) {
  return text
    .replace(/\{validDays\}/g, String(c.validDays))
    .replace(/\{earlyDays\}/g, String(c.earlyDays))
    .replace(/\{earlyDiscount\}/g, String(c.earlyDiscount))
    .replace(/\{advancePercent\}/g, String(c.advancePercent))
    .replace(/\{balancePercent\}/g, String(100 - c.advancePercent));
}

export function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatMonthYear(iso: string) {
  const s = new Date(iso).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Los trabajos que van en una propuesta: los elegidos para ella, en el orden
// del estudio, o todos si no se eligió ninguno (o ya no existe ninguno)
export function worksForQuote(works: StudioWork[], workIds?: string[]) {
  const picked = workIds?.length ? works.filter((w) => workIds.includes(w.id)) : [];
  return picked.length > 0 ? picked : works;
}
