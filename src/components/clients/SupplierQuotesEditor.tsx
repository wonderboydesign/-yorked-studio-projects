"use client";

import { useRef, useState } from "react";
import { formatMoney } from "@/lib/quotes";
import { SupplierItem, SupplierQuoteRow, supplierTotals } from "@/lib/supplierQuotes";
import { uploadFile } from "@/lib/upload";
import { Button } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

interface Draft {
  id?: string;
  title: string;
  supplier: string;
  items: SupplierItem[];
  notes: string;
  validUntil: string;
  withIva: boolean;
  fileUrl: string | null;
  filePath: string | null;
  showFile: boolean;
}

const EMPTY: Draft = {
  title: "",
  supplier: "",
  items: [{ description: "", quantity: 1, unitPrice: 0 }],
  notes: "",
  validUntil: "",
  withIva: true,
  fileUrl: null,
  filePath: null,
  showFile: false,
};

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Cotizaciones de proveedores para el portal: se capturan a mano o se le
// pasa a Claude el texto, la foto o el PDF del proveedor para armar la tabla
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
  const file = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setItem = (i: number, patch: Partial<SupplierItem>) =>
    setDraft((d) => (d ? { ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } : d));

  async function read(fileInfo?: { url: string; path: string; contentType: string }) {
    if (!draft) return;
    setReading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/supplier-quotes/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: paste, fileUrl: fileInfo?.url ?? draft.fileUrl, contentType: fileInfo?.contentType }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error ?? "No se pudo leer.");
      setDraft((d) =>
        d && {
          ...d,
          title: d.title || out.title,
          supplier: d.supplier || out.supplier,
          items: out.items.length ? out.items : d.items,
          notes: [d.notes, out.notes, out.pricesIncludeIva ? "Precios del proveedor con IVA incluido." : ""].filter(Boolean).join(" "),
          withIva: out.pricesIncludeIva ? false : d.withIva,
          validUntil: d.validUntil || (out.validDays > 0 ? addDays(out.validDays) : ""),
        }
      );
      notify("Claude armó la tabla; revísala antes de guardar");
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
      await read({ url: up.url, path: up.pathname, contentType: up.contentType });
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo subir.", "error");
      setReading(false);
    }
  }

  async function save() {
    if (!draft || !draft.title.trim()) return notify("Ponle un título a la cotización.", "error");
    setSaving(true);
    const body = { ...draft, items: draft.items.filter((it) => it.description.trim()) };
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
    notify("Cotización publicada en el portal");
  }

  async function remove(q: SupplierQuoteRow) {
    if (!window.confirm(`¿Quitar "${q.title}" del portal?`)) return;
    onChange(quotes.filter((x) => x.id !== q.id));
    await fetch(`/api/supplier-quotes/${q.id}`, { method: "DELETE" });
  }

  const totals = draft ? supplierTotals(draft.items, draft.withIva) : null;
  const field = "field rounded-lg px-2.5 py-1.5 text-sm";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base">Cotizaciones de proveedores</h3>
          <p className="text-xs text-muted mt-1">
            Producción, impresión, rotulación… El cliente las ve con tu diseño y las puede aprobar. El proveedor y el archivo
            original son internos salvo que elijas mostrarlos.
          </p>
        </div>
        {!draft && <Button onClick={() => setDraft({ ...EMPTY, items: [{ ...EMPTY.items[0] }] })}>+ Cotización</Button>}
      </div>

      {quotes.length > 0 && (
        <ul className="text-sm divide-y divide-line rounded-2xl bg-ink/[0.04] px-4">
          {quotes.map((q) => (
            <li key={q.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate">{q.title}</p>
                <p className="text-xs text-muted truncate">
                  {formatMoney(supplierTotals(q.items, q.withIva).total)}
                  {q.withIva ? " con IVA" : ""}
                  {q.supplier && ` · ${q.supplier}`}
                  {q.status === "approved" ? " · ✓ Aprobada por el cliente" : " · Esperando respuesta"}
                </p>
              </div>
              <button
                onClick={() =>
                  setDraft({
                    id: q.id,
                    title: q.title,
                    supplier: q.supplier ?? "",
                    items: q.items.length ? q.items : [{ ...EMPTY.items[0] }],
                    notes: q.notes ?? "",
                    validUntil: q.validUntil?.slice(0, 10) ?? "",
                    withIva: q.withIva,
                    fileUrl: q.fileUrl,
                    filePath: q.filePath,
                    showFile: q.showFile,
                  })
                }
                className="text-xs text-muted hover:text-ink shrink-0"
              >
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
        <div className="field rounded-2xl p-3 space-y-3">
          {/* Con Claude */}
          <div className="rounded-xl bg-ink/[0.04] p-3 space-y-2">
            <p className="text-xs text-muted">
              Pega el texto del correo o WhatsApp del proveedor, o sube la foto/PDF de su cotización, y Claude arma la tabla.
            </p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={3}
              placeholder="Ej. 1,000 vasos de papel 12 oz impresos a 2 tintas $3.20 c/u, entrega en 10 días hábiles…"
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

          <div className="grid gap-2 sm:grid-cols-2">
            <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Título para el cliente (ej. Impresión de vasos)" className={field} aria-label="Título" />
            <input value={draft.supplier} onChange={(e) => set({ supplier: e.target.value })} placeholder="Proveedor (solo lo ves tú)" className={field} aria-label="Proveedor" />
          </div>

          <div className="space-y-1.5">
            <div className="hidden sm:grid grid-cols-[1fr_70px_110px_24px] gap-2 text-[11px] text-muted px-1">
              <span>Concepto</span>
              <span>Cant.</span>
              <span>Precio unit. (sin IVA)</span>
              <span />
            </div>
            {draft.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px] sm:grid-cols-[1fr_70px_110px_24px] gap-2 items-center">
                <input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Concepto" className={`${field} col-span-2 sm:col-span-1`} aria-label="Concepto" />
                <input type="number" min={0} value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) || 0 })} className={field} aria-label="Cantidad" />
                <input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) || 0 })} className={field} aria-label="Precio unitario" />
                <button
                  type="button"
                  onClick={() => set({ items: draft.items.filter((_, j) => j !== i) })}
                  className="text-muted hover:text-red-600 text-sm justify-self-end"
                  aria-label="Quitar renglón"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set({ items: [...draft.items, { description: "", quantity: 1, unitPrice: 0 }] })} className="text-xs text-muted hover:text-ink">
              + Renglón
            </button>
          </div>

          <textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Notas para el cliente: tiempos de entrega, anticipo, envío…" className="field w-full rounded-lg px-2.5 py-2 text-sm resize-y" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2 text-xs text-muted">
              Vigente hasta
              <input type="date" value={draft.validUntil} onChange={(e) => set({ validUntil: e.target.value })} className="field rounded-lg px-2 py-1 text-xs" />
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={draft.withIva} onChange={(e) => set({ withIva: e.target.checked })} />
              Sumar IVA (16%)
            </label>
            {draft.fileUrl && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={draft.showFile} onChange={(e) => set({ showFile: e.target.checked })} />
                Mostrar el archivo original al cliente
              </label>
            )}
          </div>

          {totals && (
            <p className="text-sm">
              Subtotal {formatMoney(totals.subtotal)}
              {draft.withIva && ` · IVA ${formatMoney(totals.iva)}`} · <span className="font-medium">Total {formatMoney(totals.total)}</span>
            </p>
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
