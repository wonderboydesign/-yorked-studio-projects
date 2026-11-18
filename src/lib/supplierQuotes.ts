import { IVA_RATE } from "./portal";

// Documentos de proveedores que el estudio presenta en el portal del cliente.
// Dos formatos, con el mismo diseño del estudio:
// - quote: cotización (resumen, especificaciones, desglose, pago y condiciones)
// - options: catálogo de opciones de productos para que el cliente elija

export type SupplierKind = "quote" | "options";

export interface SupplierItem {
  description: string;
  detail?: string; // renglón gris debajo del concepto
  quantity: number;
  unitPrice: number; // MXN sin IVA
}

export interface SpecRow {
  label: string;
  value: string;
}
export interface SpecSection {
  title: string;
  rows: SpecRow[];
}

export interface QuoteDoc {
  subtitle: string;
  forName: string; // "Para"
  attention: string; // "Atención"
  // Resumen: tarjeta de cantidad y tarjeta negra con el costo de un renglón
  qtyLabel: string;
  qtyValue: string;
  qtyUnit: string;
  summaryLabel: string;
  summaryItem: number; // índice del renglón que se resalta
  summaryNote: string;
  sections: SpecSection[]; // Especificaciones, Encarpetado…
  advancePercent: number; // 0 = sin anticipo
  deliveryTime: string;
  paymentForm: string;
  footer: string;
  showBank: boolean;
}

export interface OptionProduct {
  supplier: string; // tienda o proveedor (se muestra al cliente)
  title: string;
  note: string;
  price: number | null; // null = por confirmar
  priceLabel: string; // "MXN por pieza", "paquete de 3 piezas"…
  image: string;
  link: string;
}
export interface OptionCategory {
  name: string;
  products: OptionProduct[];
}
export interface OptionsDoc {
  subtitle: string;
  forName: string;
  howTo: SpecRow[]; // Explora / Compara / Abre / Elige
  note: string;
  noteSub: string;
  categories: OptionCategory[];
}

export interface SupplierQuoteRow {
  id: string;
  kind: SupplierKind;
  title: string;
  supplier: string | null;
  doc: QuoteDoc | OptionsDoc | null;
  items: SupplierItem[];
  notes: string | null;
  validUntil: string | null;
  withIva: boolean;
  fileUrl: string | null;
  filePath: string | null;
  showFile: boolean;
  status: "pending" | "approved";
  approvedAt: string | null;
  createdAt: string;
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const urlOrEmpty = (v: unknown) => (/^https?:\/\/\S+$/i.test(str(v, 2000)) ? str(v, 2000) : "");

export function cleanItems(input: unknown): SupplierItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const description = str(o.description);
      const detail = str(o.detail) || undefined;
      const quantity = Math.max(0, Number(o.quantity) || 0);
      const unitPrice = Math.max(0, Math.round((Number(o.unitPrice) || 0) * 100) / 100);
      return { description, ...(detail ? { detail } : {}), quantity, unitPrice };
    })
    .filter((it) => it.description)
    .slice(0, 60);
}

export function cleanRows(input: unknown): SpecRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((r) => ({ label: str((r as SpecRow)?.label, 80), value: str((r as SpecRow)?.value, 300) }))
    .filter((r) => r.label || r.value)
    .slice(0, 30);
}

export const EMPTY_QUOTE_DOC: QuoteDoc = {
  subtitle: "",
  forName: "",
  attention: "",
  qtyLabel: "Cantidad",
  qtyValue: "",
  qtyUnit: "",
  summaryLabel: "",
  summaryItem: 0,
  summaryNote: "",
  sections: [],
  advancePercent: 50,
  deliveryTime: "",
  paymentForm: "",
  footer: "Precios en pesos mexicanos (MXN). Quedamos atentos a tus comentarios. Gracias.",
  showBank: true,
};

export function cleanQuoteDoc(input: unknown): QuoteDoc {
  const o = (input ?? {}) as Record<string, unknown>;
  const e = EMPTY_QUOTE_DOC;
  const adv = Number(o.advancePercent);
  return {
    subtitle: str(o.subtitle, 200),
    forName: str(o.forName, 120),
    attention: str(o.attention, 120),
    qtyLabel: str(o.qtyLabel, 40) || e.qtyLabel,
    qtyValue: str(o.qtyValue, 40),
    qtyUnit: str(o.qtyUnit, 40),
    summaryLabel: str(o.summaryLabel, 120),
    summaryItem: Math.max(0, Math.round(Number(o.summaryItem) || 0)),
    summaryNote: str(o.summaryNote, 160),
    sections: (Array.isArray(o.sections) ? o.sections : [])
      .map((s) => ({ title: str((s as SpecSection)?.title, 80), rows: cleanRows((s as SpecSection)?.rows) }))
      .filter((s) => s.title || s.rows.length)
      .slice(0, 8),
    advancePercent: Number.isFinite(adv) ? Math.min(100, Math.max(0, adv)) : e.advancePercent,
    deliveryTime: str(o.deliveryTime, 120),
    paymentForm: str(o.paymentForm, 200),
    footer: o.footer === undefined ? e.footer : str(o.footer, 300),
    showBank: o.showBank === undefined ? e.showBank : !!o.showBank,
  };
}

export const DEFAULT_HOWTO: SpecRow[] = [
  { label: "Explora", value: "Las opciones por categoría." },
  { label: "Compara", value: "Foto, proveedor, costo y notas en cada tarjeta." },
  { label: "Abre", value: "Da clic en “Ver producto” para ver el detalle." },
  { label: "Elige", value: "Dinos cuál prefieres de cada categoría." },
];

export const EMPTY_OPTIONS_DOC: OptionsDoc = {
  subtitle: "",
  forName: "",
  howTo: DEFAULT_HOWTO,
  note: "Costos por pieza en pesos mexicanos (MXN), salvo indicación.",
  noteSub: "Los precios pueden variar según el proveedor.",
  categories: [],
};

export function cleanOptionsDoc(input: unknown): OptionsDoc {
  const o = (input ?? {}) as Record<string, unknown>;
  return {
    subtitle: str(o.subtitle, 200),
    forName: str(o.forName, 120),
    howTo: cleanRows(o.howTo),
    note: str(o.note, 200),
    noteSub: str(o.noteSub, 200),
    categories: (Array.isArray(o.categories) ? o.categories : [])
      .map((c) => {
        const cat = (c ?? {}) as Record<string, unknown>;
        const products = (Array.isArray(cat.products) ? cat.products : [])
          .map((p) => {
            const pr = (p ?? {}) as Record<string, unknown>;
            const raw = pr.price;
            const price = raw === null || raw === undefined || raw === "" ? null : Number(raw);
            return {
              supplier: str(pr.supplier, 80),
              title: str(pr.title, 200),
              note: str(pr.note, 240),
              price: price !== null && Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : null,
              priceLabel: str(pr.priceLabel, 80),
              image: urlOrEmpty(pr.image),
              link: urlOrEmpty(pr.link),
            };
          })
          .filter((p) => p.title)
          .slice(0, 30);
        return { name: str(cat.name, 80), products };
      })
      .filter((c) => c.name || c.products.length)
      .slice(0, 12),
  };
}

export function supplierTotals(items: SupplierItem[], withIva: boolean) {
  const subtotal = items.reduce((n, it) => n + it.quantity * it.unitPrice, 0);
  const iva = withIva ? Math.round(subtotal * IVA_RATE * 100) / 100 : 0;
  return { subtotal, iva, total: subtotal + iva };
}

// $19,650.00: siempre con centavos, como en los documentos
export function money2(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "desde $89 MXN" de una categoría: el precio más bajo entre los que están en pesos
export function cheapestMxn(products: OptionProduct[]): number | null {
  const prices = products.filter((p) => p.price !== null && /mxn/i.test(p.priceLabel)).map((p) => p.price as number);
  return prices.length ? Math.min(...prices) : null;
}

export function countProducts(doc: OptionsDoc) {
  return doc.categories.reduce((n, c) => n + c.products.length, 0);
}

export const OPTIONS_PER_PAGE = 6;
