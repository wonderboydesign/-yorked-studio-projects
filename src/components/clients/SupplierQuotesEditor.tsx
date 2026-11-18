"use client";

import { useRef, useState } from "react";
import { formatMoney } from "@/lib/quotes";
import {
  EMPTY_OPTIONS_DOC,
  EMPTY_QUOTE_DOC,
  OptionsDoc,
  QuoteDoc,
  SupplierItem,
  SupplierKind,
  SupplierQuoteRow,
  cleanOptionsDoc,
  cleanQuoteDoc,
  countProducts,
  supplierTotals,
} from "@/lib/supplierQuotes";
import { shrinkImage, uploadFile } from "@/lib/upload";
import { Button } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

// Las listas de renglones se editan como texto ("Etiqueta | valor") y se
// convierten al guardar, para poder escribir con saltos de línea sin que se
// reacomode el texto
interface SpecDraft {
  title: string;
  text: string;
}
interface ProductDraft {
  supplier: string;
  title: string;
  note: string;
  price: string;
  priceLabel: string;
  image: string;
  link: string;
}
interface CategoryDraft {
  name: string;
  products: ProductDraft[];
}

interface Draft {
  id?: string;
  kind: SupplierKind;
  title: string;
  supplier: string;
  notes: string;
  validUntil: string;
  withIva: boolean;
  items: SupplierItem[];
  quote: Omit<QuoteDoc, "sections">;
  specs: SpecDraft[];
  options: Omit<OptionsDoc, "howTo" | "categories">;
  howToText: string;
  categories: CategoryDraft[];
  fileUrl: string | null;
  filePath: string | null;
  showFile: boolean;
  // Qué ve el cliente: el diseño del portal o el archivo del estudio tal cual
  view: "design" | "pdf";
}

const rowsToText = (rows: { label: string; value: string }[]) => rows.map((r) => `${r.label} | ${r.value}`).join("\n");
const textToRows = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("|");
      return i === -1 ? { label: l, value: "" } : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
    });

const newProduct = (): ProductDraft => ({ supplier: "", title: "", note: "", price: "", priceLabel: "MXN por pieza", image: "", link: "" });

function emptyDraft(kind: SupplierKind): Draft {
  const { sections: _s, ...quote } = EMPTY_QUOTE_DOC;
  const { howTo, categories: _c, ...options } = EMPTY_OPTIONS_DOC;
  return {
    kind,
    title: kind === "options" ? "Proveedores" : "Cotización",
    supplier: "",
    notes: "",
    validUntil: "",
    withIva: kind === "quote",
    items: [{ description: "", quantity: 1, unitPrice: 0 }],
    quote,
    specs: [{ title: "Especificaciones", text: "" }],
    options,
    howToText: rowsToText(howTo),
    categories: [{ name: "", products: [newProduct()] }],
    fileUrl: null,
    filePath: null,
    showFile: false,
    view: "design",
  };
}

function fromRow(q: SupplierQuoteRow): Draft {
  const base = emptyDraft(q.kind);
  if (q.kind === "options") {
    const doc = cleanOptionsDoc(q.doc);
    const { howTo, categories, ...options } = doc;
    return {
      ...base,
      id: q.id,
      title: q.title,
      supplier: q.supplier ?? "",
      notes: q.notes ?? "",
      options,
      howToText: rowsToText(howTo),
      categories: categories.length
        ? categories.map((c) => ({ name: c.name, products: c.products.map((p) => ({ ...p, price: p.price === null ? "" : String(p.price) })) }))
        : base.categories,
      fileUrl: q.fileUrl,
      filePath: q.filePath,
      showFile: q.showFile,
      view: q.view ?? "design",
    };
  }
  const { sections, ...quote } = cleanQuoteDoc(q.doc);
  return {
    ...base,
    id: q.id,
    title: q.title,
    supplier: q.supplier ?? "",
    notes: q.notes ?? "",
    validUntil: q.validUntil?.slice(0, 10) ?? "",
    withIva: q.withIva,
    items: q.items.length ? q.items : base.items,
    quote,
    specs: sections.length ? sections.map((s) => ({ title: s.title, text: rowsToText(s.rows) })) : base.specs,
    fileUrl: q.fileUrl,
    filePath: q.filePath,
    showFile: q.showFile,
    view: q.view ?? "design",
  };
}

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const KIND_LABEL: Record<SupplierKind, string> = { quote: "Cotización", options: "Opciones de productos" };

// Documentos de proveedores para el portal, con el diseño del estudio. Se
// capturan a mano o se le pasa a Claude el texto, la foto o el PDF
export default function SupplierQuotesEditor({
  projectId,
  quotes,
  notify,
  onChange,
}: {
  projectId: string;
  quotes: SupplierQuoteRow[];
  notify: Notify;
  onChange: (q: SupplierQuoteRow[]) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [paste, setPaste] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const imgFile = useRef<HTMLInputElement>(null);
  const officialFile = useRef<HTMLInputElement>(null);
  const imgTarget = useRef<[number, number] | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setQuote = (patch: Partial<Draft["quote"]>) => setDraft((d) => (d ? { ...d, quote: { ...d.quote, ...patch } } : d));
  const setOptions = (patch: Partial<Draft["options"]>) => setDraft((d) => (d ? { ...d, options: { ...d.options, ...patch } } : d));
  const setItem = (i: number, patch: Partial<SupplierItem>) =>
    setDraft((d) => (d ? { ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } : d));
  const setCat = (ci: number, patch: Partial<CategoryDraft>) =>
    setDraft((d) => (d ? { ...d, categories: d.categories.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : d));
  const setProduct = (ci: number, pi: number, patch: Partial<ProductDraft>) =>
    setDraft((d) =>
      d
        ? { ...d, categories: d.categories.map((c, j) => (j === ci ? { ...c, products: c.products.map((p, k) => (k === pi ? { ...p, ...patch } : p)) } : c)) }
        : d
    );

  // Lo que devuelve Claude se vuelca al formulario para revisarlo
  async function read(fileInfo?: { url: string; contentType: string }) {
    if (!draft) return;
    setReading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/supplier-quotes/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: draft.kind, text: paste, fileUrl: fileInfo?.url ?? draft.fileUrl, contentType: fileInfo?.contentType }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error ?? "No se pudo leer.");
      setDraft((d) => {
        if (!d) return d;
        if (d.kind === "options") {
          return {
            ...d,
            title: out.title || d.title,
            options: { ...d.options, subtitle: out.subtitle || d.options.subtitle, forName: out.forName || d.options.forName, note: out.note || d.options.note, noteSub: out.noteSub || d.options.noteSub },
            categories: out.categories.length
              ? out.categories.map((c: { name: string; products: Record<string, unknown>[] }) => ({
                  name: c.name,
                  products: c.products.map((p) => ({
                    supplier: String(p.supplier ?? ""),
                    title: String(p.title ?? ""),
                    note: String(p.note ?? ""),
                    price: p.priceUnknown ? "" : String(p.price ?? ""),
                    priceLabel: String(p.priceLabel ?? ""),
                    image: "",
                    link: String(p.link ?? ""),
                  })),
                }))
              : d.categories,
          };
        }
        return {
          ...d,
          title: out.title || d.title,
          supplier: out.supplier || d.supplier,
          items: out.items.length ? out.items.map((it: SupplierItem & { detail: string }) => ({ ...it, detail: it.detail || undefined })) : d.items,
          notes: [d.notes, out.notes].filter(Boolean).join(" "),
          withIva: out.pricesIncludeIva ? false : d.withIva,
          validUntil: d.validUntil || (out.validDays > 0 ? addDays(out.validDays) : ""),
          quote: {
            ...d.quote,
            subtitle: out.subtitle || d.quote.subtitle,
            forName: out.forName || d.quote.forName,
            attention: out.attention || d.quote.attention,
            qtyLabel: out.qtyLabel || d.quote.qtyLabel,
            qtyValue: out.qtyValue || d.quote.qtyValue,
            qtyUnit: out.qtyUnit || d.quote.qtyUnit,
            summaryLabel: out.summaryLabel || d.quote.summaryLabel,
            summaryItem: Number.isFinite(out.summaryItem) ? out.summaryItem : 0,
            summaryNote: out.summaryNote || d.quote.summaryNote,
            deliveryTime: out.deliveryTime || d.quote.deliveryTime,
            paymentForm: out.paymentForm || d.quote.paymentForm,
            advancePercent: Number.isFinite(out.advancePercent) ? out.advancePercent : d.quote.advancePercent,
          },
          specs: out.sections.length
            ? out.sections.map((s: { title: string; rows: { label: string; value: string }[] }) => ({ title: s.title, text: rowsToText(s.rows) }))
            : d.specs,
        };
      });
      notify("Claude armó el documento; revísalo antes de publicar");
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo leer.", "error");
    } finally {
      setReading(false);
    }
  }

  async function attach(f: File) {
    try {
      setReading(true);
      const up = await uploadFile(f, ["pdf", "jpg", "jpeg", "png", "webp"]);
      set({ fileUrl: up.url, filePath: up.pathname });
      await read({ url: up.url, contentType: up.contentType });
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo subir.", "error");
      setReading(false);
    }
  }

  // Sube el archivo que el cliente verá tal cual (sin pasar por Claude)
  async function uploadOfficial(f: File) {
    try {
      setReading(true);
      const up = await uploadFile(f, ["pdf", "jpg", "jpeg", "png", "webp"]);
      set({ fileUrl: up.url, filePath: up.pathname, view: "pdf" });
      notify("Archivo subido; el cliente lo verá tal cual");
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo subir.", "error");
    } finally {
      setReading(false);
    }
  }

  async function uploadProductImage(f: File) {
    const t = imgTarget.current;
    if (!t) return;
    const key = `${t[0]}-${t[1]}`;
    setUploadingImg(key);
    try {
      const up = await uploadFile(await shrinkImage(f, 900), ["jpg", "jpeg", "png", "webp"]);
      setProduct(t[0], t[1], { image: up.url });
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo subir la imagen.", "error");
    } finally {
      setUploadingImg(null);
    }
  }

  async function save() {
    if (!draft || !draft.title.trim()) return notify("Ponle un título al documento.", "error");
    if (draft.view === "pdf" && !draft.fileUrl) return notify("Sube el PDF que verá el cliente, o elige el diseño del portal.", "error");
    setSaving(true);
    const isOptions = draft.kind === "options";
    const body = isOptions
      ? {
          kind: "options",
          title: draft.title,
          notes: draft.notes,
          doc: {
            ...draft.options,
            howTo: textToRows(draft.howToText),
            categories: draft.categories.map((c) => ({
              name: c.name,
              products: c.products.map((p) => ({ ...p, price: p.price.trim() === "" ? null : Number(p.price) })),
            })),
          },
          fileUrl: draft.fileUrl,
          filePath: draft.filePath,
          showFile: draft.showFile,
          view: draft.view,
        }
      : {
          kind: "quote",
          title: draft.title,
          supplier: draft.supplier,
          items: draft.items.filter((it) => it.description.trim()),
          notes: draft.notes,
          validUntil: draft.validUntil,
          withIva: draft.withIva,
          doc: { ...draft.quote, sections: draft.specs.map((s) => ({ title: s.title, rows: textToRows(s.text) })) },
          fileUrl: draft.fileUrl,
          filePath: draft.filePath,
          showFile: draft.showFile,
          view: draft.view,
        };
    const res = await fetch(draft.id ? `/api/supplier-quotes/${draft.id}` : `/api/projects/${projectId}/supplier-quotes`, {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) return notify((await res.json().catch(() => null))?.error ?? "No se pudo guardar.", "error");
    const q: SupplierQuoteRow = await res.json();
    onChange(draft.id ? quotes.map((x) => (x.id === q.id ? q : x)) : [q, ...quotes]);
    setDraft(null);
    setPaste("");
    notify("Documento publicado en el portal");
  }

  async function remove(q: SupplierQuoteRow) {
    if (!window.confirm(`¿Quitar "${q.title}" del portal?`)) return;
    onChange(quotes.filter((x) => x.id !== q.id));
    await fetch(`/api/supplier-quotes/${q.id}`, { method: "DELETE" });
  }

  const totals = draft && draft.kind === "quote" ? supplierTotals(draft.items, draft.withIva) : null;
  const field = "field rounded-lg px-2.5 py-1.5 text-sm";
  const label = "text-[11px] text-muted";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base">Cotizaciones y opciones de proveedores</h3>
          <p className="text-xs text-muted mt-1">
            Producción, impresión, merch… Se ven con el diseño del estudio en el portal y el cliente las puede descargar en PDF. La
            cotización la puede aprobar; las opciones son para que elija.
          </p>
        </div>
        {!draft && (
          <div className="flex gap-2">
            <Button onClick={() => setDraft(emptyDraft("quote"))}>+ Cotización</Button>
            <Button onClick={() => setDraft(emptyDraft("options"))}>+ Opciones</Button>
          </div>
        )}
      </div>

      {quotes.length > 0 && (
        <ul className="text-sm divide-y divide-line rounded-2xl bg-ink/[0.04] px-4">
          {quotes.map((q) => (
            <li key={q.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate">{q.title}</p>
                <p className="text-xs text-muted truncate">
                  {KIND_LABEL[q.kind]}{q.view === "pdf" ? " · PDF original" : ""} ·{" "}
                  {q.kind === "options"
                    ? `${countProducts(cleanOptionsDoc(q.doc))} productos`
                    : `${formatMoney(supplierTotals(q.items, q.withIva).total)}${q.withIva ? " con IVA" : ""}${q.status === "approved" ? " · ✓ Aprobada por el cliente" : " · Esperando respuesta"}`}
                </p>
              </div>
              <button onClick={() => setDraft(fromRow(q))} className="text-xs text-muted hover:text-ink shrink-0">
                Editar
              </button>
              <button onClick={() => remove(q)} className="text-xs text-muted hover:text-red-600 shrink-0">
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="field rounded-2xl p-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">{draft.id ? "Editar" : "Nuevo"}: {KIND_LABEL[draft.kind]}</p>
            {!draft.id && (
              <div className="flex gap-1 text-xs">
                {(["quote", "options"] as SupplierKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setDraft({ ...emptyDraft(k), fileUrl: draft.fileUrl, filePath: draft.filePath })}
                    className={`px-3 py-1 rounded-full ${draft.kind === k ? "bg-ink text-paper" : "bg-button hover:bg-button-hover text-ink"}`}
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Con Claude */}
          <div className="rounded-xl bg-ink/[0.04] p-3 space-y-2">
            <p className="text-xs text-muted">
              {draft.kind === "options"
                ? "Pega la lista de productos (nombre, tienda, precio, link) o sube una captura o PDF, y Claude los agrupa por categoría."
                : "Pega el texto del correo o WhatsApp del proveedor, o sube la foto/PDF de su cotización, y Claude arma el documento."}
            </p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={3}
              placeholder={draft.kind === "options" ? "Ej. Playera básica negra, Mercado Libre, $118 · https://…" : "Ej. 10 catálogos couché 300 g, F/V, laminado mate: $19,650. 10 carpetas negras a $300 c/u. Entrega 3 semanas…"}
              className="field w-full rounded-lg px-2.5 py-2 text-sm resize-y"
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button onClick={() => file.current?.click()} disabled={reading}>
                {reading ? "Leyendo…" : "Subir foto o PDF"}
              </Button>
              <Button tone="primary" onClick={() => read()} disabled={reading || !paste.trim()}>
                {reading ? "Leyendo…" : "Armar con Claude"}
              </Button>
              <input
                ref={file}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) attach(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Qué ve el cliente */}
          <div className="rounded-xl bg-ink/[0.04] p-3 space-y-2">
            <p className="text-sm">Qué ve el cliente</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {([
                ["design", "Diseño del portal"],
                ["pdf", "Mi PDF tal cual"],
              ] as const).map(([v, text]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => (v === "pdf" && !draft.fileUrl ? officialFile.current?.click() : set({ view: v }))}
                  className={`px-3 py-1.5 rounded-full ${draft.view === v ? "bg-ink text-paper" : "bg-button hover:bg-button-hover text-ink"}`}
                >
                  {text}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {draft.view === "pdf"
                ? "El cliente ve tu archivo idéntico, con vista previa y botón de descargar. Los datos de abajo solo sirven para el total y las notas tuyas."
                : "Se arma con los datos de abajo, con el diseño del portal: se edita, se ve bien en celular y se puede aprobar."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => officialFile.current?.click()} disabled={reading}>
                {draft.fileUrl ? "Cambiar el PDF" : "Subir mi PDF"}
              </Button>
              {draft.fileUrl && (
                <a href={draft.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink">
                  Ver archivo subido ↗
                </a>
              )}
              <input
                ref={officialFile}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadOfficial(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={label}>Título del documento</span>
              <input value={draft.title} onChange={(e) => set({ title: e.target.value })} className={`${field} w-full`} />
            </label>
            <label className="space-y-1">
              <span className={label}>{draft.kind === "quote" ? "Subtítulo (de qué trata)" : "Subtítulo"}</span>
              <input
                value={draft.kind === "quote" ? draft.quote.subtitle : draft.options.subtitle}
                onChange={(e) => (draft.kind === "quote" ? setQuote({ subtitle: e.target.value }) : setOptions({ subtitle: e.target.value }))}
                placeholder={draft.kind === "quote" ? "Impresión de catálogos y encarpetado." : "Merch para el cliente. Opciones para elegir."}
                className={`${field} w-full`}
              />
            </label>
            <label className="space-y-1">
              <span className={label}>Para (por defecto, el cliente del proyecto)</span>
              <input
                value={draft.kind === "quote" ? draft.quote.forName : draft.options.forName}
                onChange={(e) => (draft.kind === "quote" ? setQuote({ forName: e.target.value }) : setOptions({ forName: e.target.value }))}
                className={`${field} w-full`}
              />
            </label>
            {draft.kind === "quote" && (
              <>
                <label className="space-y-1">
                  <span className={label}>Atención</span>
                  <input value={draft.quote.attention} onChange={(e) => setQuote({ attention: e.target.value })} className={`${field} w-full`} />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className={label}>Proveedor (solo lo ves tú)</span>
                  <input value={draft.supplier} onChange={(e) => set({ supplier: e.target.value })} className={`${field} w-full`} />
                </label>
              </>
            )}
          </div>

          {draft.kind === "quote" ? (
            <>
              {/* Resumen */}
              <div className="space-y-2">
                <p className="text-sm">Resumen</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input value={draft.quote.qtyValue} onChange={(e) => setQuote({ qtyValue: e.target.value })} placeholder="Cantidad (10)" className={field} aria-label="Cantidad" />
                  <input value={draft.quote.qtyUnit} onChange={(e) => setQuote({ qtyUnit: e.target.value })} placeholder="Unidad (catálogos)" className={field} aria-label="Unidad" />
                  <select value={draft.quote.summaryItem} onChange={(e) => setQuote({ summaryItem: Number(e.target.value) })} className={field} aria-label="Renglón a resaltar">
                    {draft.items.map((it, i) => (
                      <option key={i} value={i}>
                        Resaltar: {it.description || `Renglón ${i + 1}`}
                      </option>
                    ))}
                  </select>
                  <input value={draft.quote.summaryLabel} onChange={(e) => setQuote({ summaryLabel: e.target.value })} placeholder="Título del costo resaltado" className={`${field} sm:col-span-2`} aria-label="Título del costo" />
                  <input value={draft.quote.summaryNote} onChange={(e) => setQuote({ summaryNote: e.target.value })} placeholder="más IVA, por los 10 catálogos" className={field} aria-label="Nota del costo" />
                </div>
              </div>

              {/* Especificaciones */}
              <div className="space-y-2">
                <p className="text-sm">Especificaciones</p>
                {draft.specs.map((s, i) => (
                  <div key={i} className="rounded-xl bg-ink/[0.03] p-2 space-y-1.5">
                    <div className="flex gap-2">
                      <input value={s.title} onChange={(e) => set({ specs: draft.specs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Título (Especificaciones, Encarpetado…)" className={`${field} flex-1`} />
                      <button type="button" onClick={() => set({ specs: draft.specs.filter((_, j) => j !== i) })} className="text-xs text-muted hover:text-red-600">
                        Quitar
                      </button>
                    </div>
                    <textarea
                      value={s.text}
                      onChange={(e) => set({ specs: draft.specs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                      rows={4}
                      placeholder={"Una línea por dato: Etiqueta | valor\nPapel | Couché de 300 gramos\nAcabado | Laminado mate"}
                      className="field w-full rounded-lg px-2.5 py-2 text-sm resize-y"
                    />
                  </div>
                ))}
                <button type="button" onClick={() => set({ specs: [...draft.specs, { title: "", text: "" }] })} className="text-xs text-muted hover:text-ink">
                  + Sección
                </button>
              </div>

              {/* Desglose */}
              <div className="space-y-1.5">
                <p className="text-sm">Desglose</p>
                <div className="hidden sm:grid grid-cols-[1fr_70px_110px_24px] gap-2 text-[11px] text-muted px-1">
                  <span>Concepto y detalle</span>
                  <span>Cant.</span>
                  <span>P. unit. (sin IVA)</span>
                  <span />
                </div>
                {draft.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px] sm:grid-cols-[1fr_70px_110px_24px] gap-2 items-start">
                    <div className="col-span-2 sm:col-span-1 space-y-1">
                      <input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Concepto" className={`${field} w-full`} aria-label="Concepto" />
                      <input value={it.detail ?? ""} onChange={(e) => setItem(i, { detail: e.target.value })} placeholder="Detalle (Couché 300 g, laminado mate…)" className={`${field} w-full text-xs`} aria-label="Detalle" />
                    </div>
                    <input type="number" min={0} value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) || 0 })} className={field} aria-label="Cantidad" />
                    <input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) || 0 })} className={field} aria-label="Precio unitario" />
                    <button type="button" onClick={() => set({ items: draft.items.filter((_, j) => j !== i) })} className="text-muted hover:text-red-600 text-sm justify-self-end mt-1" aria-label="Quitar renglón">
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => set({ items: [...draft.items, { description: "", quantity: 1, unitPrice: 0 }] })} className="text-xs text-muted hover:text-ink">
                  + Renglón
                </button>
              </div>

              {/* Pago y condiciones */}
              <div className="space-y-2">
                <p className="text-sm">Pago y condiciones</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Anticipo %
                    <input type="number" min={0} max={100} value={draft.quote.advancePercent} onChange={(e) => setQuote({ advancePercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className={`${field} w-20 text-ink`} />
                    <span>(0 = sin anticipo)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Vigente hasta
                    <input type="date" value={draft.validUntil} onChange={(e) => set({ validUntil: e.target.value })} className={`${field} text-ink`} />
                  </label>
                  <input value={draft.quote.deliveryTime} onChange={(e) => setQuote({ deliveryTime: e.target.value })} placeholder="Tiempo de entrega (aprox. 3 semanas)" className={field} aria-label="Tiempo de entrega" />
                  <input value={draft.quote.paymentForm} onChange={(e) => setQuote({ paymentForm: e.target.value })} placeholder="Forma de pago (50% anticipo y 50% contra entrega)" className={field} aria-label="Forma de pago" />
                </div>
                <textarea value={draft.quote.footer} onChange={(e) => setQuote({ footer: e.target.value })} rows={2} placeholder="Texto del pie" className="field w-full rounded-lg px-2.5 py-2 text-sm resize-y" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={draft.withIva} onChange={(e) => set({ withIva: e.target.checked })} />
                    Sumar IVA (16%)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={draft.quote.showBank} onChange={(e) => setQuote({ showBank: e.target.checked })} />
                    Mostrar datos para transferencia
                  </label>
                </div>
                {totals && (
                  <p className="text-sm">
                    Subtotal {formatMoney(totals.subtotal)}
                    {draft.withIva && ` · IVA ${formatMoney(totals.iva)}`} · <span className="font-medium">Total {formatMoney(totals.total)}</span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <label className="block space-y-1">
                <span className={label}>Cómo usar este documento (una línea por paso: Etiqueta | texto)</span>
                <textarea value={draft.howToText} onChange={(e) => set({ howToText: e.target.value })} rows={4} className="field w-full rounded-lg px-2.5 py-2 text-sm resize-y" />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={draft.options.note} onChange={(e) => setOptions({ note: e.target.value })} placeholder="Nota (moneda, aclaraciones)" className={field} aria-label="Nota" />
                <input value={draft.options.noteSub} onChange={(e) => setOptions({ noteSub: e.target.value })} placeholder="Nota 2 (los precios pueden variar…)" className={field} aria-label="Nota 2" />
              </div>

              <div className="space-y-3">
                {draft.categories.map((c, ci) => (
                  <div key={ci} className="rounded-xl bg-ink/[0.03] p-2.5 space-y-2">
                    <div className="flex gap-2">
                      <input value={c.name} onChange={(e) => setCat(ci, { name: e.target.value })} placeholder="Categoría (Playeras, Gorras…)" className={`${field} flex-1`} aria-label="Categoría" />
                      <button type="button" onClick={() => set({ categories: draft.categories.filter((_, j) => j !== ci) })} className="text-xs text-muted hover:text-red-600">
                        Quitar categoría
                      </button>
                    </div>
                    {c.products.map((p, pi) => (
                      <div key={pi} className="field rounded-xl p-2 grid gap-1.5 sm:grid-cols-[84px_1fr]">
                        <button
                          type="button"
                          onClick={() => {
                            imgTarget.current = [ci, pi];
                            imgFile.current?.click();
                          }}
                          className="relative h-[84px] w-[84px] rounded-lg bg-white border border-line overflow-hidden text-[11px] text-muted"
                          title="Subir imagen del producto"
                        >
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-contain" />
                          ) : uploadingImg === `${ci}-${pi}` ? (
                            "Subiendo…"
                          ) : (
                            "+ Imagen"
                          )}
                        </button>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          <input value={p.title} onChange={(e) => setProduct(ci, pi, { title: e.target.value })} placeholder="Producto" className={`${field} sm:col-span-2`} aria-label="Producto" />
                          <input value={p.supplier} onChange={(e) => setProduct(ci, pi, { supplier: e.target.value })} placeholder="Tienda (Mercado Libre)" className={field} aria-label="Tienda" />
                          <div className="flex gap-1.5">
                            <input type="number" min={0} step="0.01" value={p.price} onChange={(e) => setProduct(ci, pi, { price: e.target.value })} placeholder="Precio (vacío = por confirmar)" className={`${field} min-w-0 flex-1`} aria-label="Precio" />
                            <input value={p.priceLabel} onChange={(e) => setProduct(ci, pi, { priceLabel: e.target.value })} placeholder="MXN por pieza" className={`${field} min-w-0 flex-1`} aria-label="Unidad del precio" />
                          </div>
                          <input value={p.link} onChange={(e) => setProduct(ci, pi, { link: e.target.value })} placeholder="Link del producto (https://…)" className={field} aria-label="Link" />
                          <input value={p.image} onChange={(e) => setProduct(ci, pi, { image: e.target.value })} placeholder="o link de la imagen (https://…)" className={field} aria-label="Link de imagen" />
                          <input value={p.note} onChange={(e) => setProduct(ci, pi, { note: e.target.value })} placeholder="Nota (opcional)" className={`${field} sm:col-span-2`} aria-label="Nota del producto" />
                          <button type="button" onClick={() => setCat(ci, { products: c.products.filter((_, k) => k !== pi) })} className="text-xs text-muted hover:text-red-600 justify-self-start">
                            Quitar producto
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setCat(ci, { products: [...c.products, newProduct()] })} className="text-xs text-muted hover:text-ink">
                      + Producto
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => set({ categories: [...draft.categories, { name: "", products: [newProduct()] }] })} className="text-xs text-muted hover:text-ink">
                  + Categoría
                </button>
                <input
                  ref={imgFile}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadProductImage(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </>
          )}

          <textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Notas internas para ti (el cliente no las ve)" className="field w-full rounded-lg px-2.5 py-2 text-sm resize-y" />

          {draft.fileUrl && draft.view !== "pdf" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={draft.showFile} onChange={(e) => set({ showFile: e.target.checked })} />
              Mostrar el archivo original del proveedor al cliente
            </label>
          )}

          <div className="flex justify-end gap-2">
            <Button tone="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button tone="primary" onClick={save} disabled={saving || reading}>
              {saving ? "Guardando…" : draft.id ? "Guardar cambios" : "Publicar en el portal"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
