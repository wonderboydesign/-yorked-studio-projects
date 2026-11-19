"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";
import { PaymentRow, Progress, clientAmount } from "@/lib/portal";
import { formatMoney } from "@/lib/quotes";
import { Button } from "../branding/ui";
import PortalLinksEditor, { PortalLinkRow } from "./PortalLinksEditor";
import PhaseBuilder from "./PhaseBuilder";
import SupplierQuotesEditor from "./SupplierQuotesEditor";
import { SupplierQuoteRow } from "@/lib/supplierQuotes";

type Notify = (message: string, tone?: "ok" | "error") => void;

interface PortalState {
  id: string;
  name: string;
  portalToken: string | null;
  portalViewedAt: string | null;
  payments: PaymentRow[];
  progress: Omit<Progress, "start" | "end" | "phases"> & {
    start: string | null;
    end: string | null;
    phases: { number: string; name: string; start: string; end: string; state: string; percent: number }[];
  };
  hasApprovedQuote: boolean;
  priceTotal: number | null;
  progressOverride: number | null;
  estimatedEnd: string | null;
  documents: PortalDocument[];
  links: PortalLinkRow[];
  quoteToken: string | null;
  supplierQuotes: SupplierQuoteRow[];
}

interface PortalDocument {
  id: string;
  kind: "tax_certificate" | "invoice";
  name: string;
  url: string;
  uploadedBy: "client" | "studio";
  createdAt: string;
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const STATE = { done: "✓ Terminada", active: "En curso", upcoming: "Por venir" } as Record<string, string>;

// Portal del cliente de un proyecto: la liga para mandarle, una vista previa
// del avance (sale de las tareas) y los pagos que se marcan como pagados
export default function ClientPortalPanel({
  projectId,
  notify,
  onClose,
  onDataChanged,
}: {
  projectId: string;
  notify: Notify;
  onClose: () => void;
  onDataChanged?: () => void;
}) {
  const [s, setS] = useState<PortalState | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingInvoices, setUploadingInvoices] = useState(0);
  const invoiceInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/portal`);
    if (res.ok) setS(await res.json());
    else notify("No se pudo abrir el portal.", "error");
  }, [projectId, notify]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const url = s?.portalToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${s.portalToken}` : "";

  async function act(action: "enable" | "regenerate" | "disable") {
    if (action === "regenerate" && !window.confirm("La liga actual dejará de funcionar. ¿Crear una nueva?")) return;
    if (action === "disable" && !window.confirm("El cliente ya no podrá abrir el portal. ¿Desactivar?")) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) setS(await res.json());
    else notify("No se pudo actualizar el portal.", "error");
  }

  // Ajuste manual del avance y la fecha de entrega (null = volver al automático)
  async function saveManual(fields: { progressOverride?: number | null; estimatedEnd?: string | null }) {
    const res = await fetch(`/api/projects/${projectId}/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "progress", ...fields }),
    });
    if (res.ok) {
      setS(await res.json());
      onDataChanged?.();
      notify("Guardado");
    } else notify((await res.json().catch(() => null))?.error ?? "No se pudo guardar.", "error");
  }

  async function savePrice(fields: { priceTotal?: number | null }) {
    const res = await fetch(`/api/projects/${projectId}/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "price", ...fields }),
    });
    if (res.ok) {
      setS(await res.json());
      notify("Precio guardado; los pagos pendientes se ajustaron");
    } else notify("No se pudo guardar el precio.", "error");
  }

  async function completeAll() {
    if (!window.confirm("¿Marcar todas las fases como terminadas? El portal mostrará el proyecto al 100%.")) return;
    const res = await fetch(`/api/projects/${projectId}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    if (!res.ok) return notify("No se pudo actualizar.", "error");
    notify("Proyecto al 100%");
    load();
    onDataChanged?.();
  }

  async function addPayment(fromQuote = false) {
    const res = await fetch(`/api/projects/${projectId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fromQuote ? { fromQuote: true } : { label: `Pago ${(s?.payments.length ?? 0) + 1}`, amount: 0 }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      return notify(b?.error ?? "No se pudo agregar el pago.", "error");
    }
    const payments: PaymentRow[] = await res.json();
    setS((x) => (x ? { ...x, payments } : x));
  }

  async function patchPayment(id: string, fields: Record<string, unknown>) {
    setS((x) => (x ? { ...x, payments: x.payments.map((p) => (p.id === id ? ({ ...p, ...fields } as PaymentRow) : p)) } : x));
    const res = await fetch(`/api/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const p: PaymentRow = await res.json();
      setS((x) => (x ? { ...x, payments: x.payments.map((y) => (y.id === id ? p : y)) } : x));
    } else {
      notify("No se pudo guardar el pago.", "error");
      load();
    }
  }

  async function deletePayment(id: string) {
    if (!window.confirm("¿Quitar este pago?")) return;
    setS((x) => (x ? { ...x, payments: x.payments.filter((p) => p.id !== id) } : x));
    await fetch(`/api/payments/${id}`, { method: "DELETE" });
  }

  async function uploadInvoices(files: File[]) {
    for (const file of files) {
      setUploadingInvoices((n) => n + 1);
      try {
        const up = await uploadFile(file, ["pdf", "xml"]);
        const res = await fetch(`/api/projects/${projectId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "invoice", url: up.url, pathname: up.pathname, name: up.filename, contentType: up.contentType, size: file.size }),
        });
        if (!res.ok) throw new Error("No se pudo guardar la factura.");
        const doc: PortalDocument = await res.json();
        setS((x) => (x ? { ...x, documents: [doc, ...x.documents] } : x));
      } catch (e) {
        notify(e instanceof Error ? e.message : "No se pudo subir la factura.", "error");
      } finally {
        setUploadingInvoices((n) => n - 1);
      }
    }
  }

  async function deleteDocument(d: PortalDocument) {
    if (!window.confirm(`¿Quitar "${d.name}"? El cliente ya no lo verá.`)) return;
    setS((x) => (x ? { ...x, documents: x.documents.filter((y) => y.id !== d.id) } : x));
    const res = await fetch(`/api/documents/${d.id}`, { method: "DELETE" });
    if (!res.ok) {
      notify("No se pudo quitar.", "error");
      load();
    }
  }

  const certificates = s?.documents.filter((d) => d.kind === "tax_certificate") ?? [];
  const invoices = s?.documents.filter((d) => d.kind === "invoice") ?? [];
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

  const clientTotal = s?.payments.reduce((n, p) => n + clientAmount(p.amount, p.withIva), 0) ?? 0;
  const setLinks = (links: PortalLinkRow[]) => setS((x) => (x ? { ...x, links } : x));
  const phaseOptions = s?.progress.phases.map((p) => ({ number: p.number, name: p.name })) ?? [];

  const total = s?.payments.reduce((n, p) => n + p.amount, 0) ?? 0;
  const paid = s?.payments.filter((p) => p.paidAt).reduce((n, p) => n + p.amount, 0) ?? 0;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass-overlay rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-8 pt-6 pb-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">Portal del cliente</p>
            <h2 className="text-xl truncate">{s?.name ?? "…"}</h2>
          </div>
          <Button tone="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        {!s ? (
          <p className="px-8 pb-8 text-sm text-muted">Cargando…</p>
        ) : (
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8">
            {/* Liga */}
            <section className="space-y-3">
              {s.portalToken ? (
                <>
                  <div className="flex gap-2">
                    <input readOnly value={url} onFocus={(e) => e.target.select()} className="field flex-1 min-w-0 rounded-xl px-3 py-2 text-sm" />
                    <Button
                      tone="primary"
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        notify("Liga del portal copiada");
                      }}
                    >
                      Copiar liga
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>
                      {s.portalViewedAt
                        ? `El cliente lo abrió por última vez el ${new Date(s.portalViewedAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`
                        : "El cliente aún no lo abre"}
                    </span>
                    <span className="ml-auto flex gap-3">
                      <button onClick={() => window.open(url, "_blank")} className="hover:text-ink">
                        Ver ↗
                      </button>
                      <button onClick={() => act("regenerate")} className="hover:text-ink" disabled={busy}>
                        Liga nueva
                      </button>
                      <button onClick={() => act("disable")} className="hover:text-red-600" disabled={busy}>
                        Desactivar
                      </button>
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-ink/[0.04] p-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm max-w-sm">
                    Una liga privada donde el cliente ve el avance de su proyecto por fases y sus pagos. No ve tareas internas,
                    notas ni quién está asignado.
                  </p>
                  <Button tone="primary" onClick={() => act("enable")} disabled={busy}>
                    {busy ? "Creando…" : "Crear liga del portal"}
                  </Button>
                </div>
              )}
            </section>

            {/* Propuesta */}
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm">Propuesta</p>
                <p className="text-xs text-muted">
                  {s.quoteToken ? "El cliente la tiene a la mano arriba en su portal, para recordar el alcance." : "Este proyecto no tiene una propuesta enviada ligada."}
                </p>
              </div>
              {s.quoteToken && (
                <a href={`/p/${s.quoteToken}`} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-ink shrink-0">
                  Ver propuesta ↗
                </a>
              )}
            </section>

            <PortalLinksEditor kind="meeting" projectId={projectId} links={s.links} phases={phaseOptions} notify={notify} onChange={setLinks} />

            {/* Avance */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base">Avance que ve el cliente</h3>
                <span className="text-3xl tracking-[-0.02em] tabular-nums">{s.progressOverride ?? s.progress.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${s.progressOverride ?? s.progress.percent}%` }} />
              </div>
              {s.progress.phases.length === 0 ? (
                <PhaseBuilder
                  projectId={projectId}
                  notify={notify}
                  onDone={() => {
                    load();
                    onDataChanged?.();
                  }}
                />
              ) : (
                <ul className="text-sm divide-y divide-line">
                  {s.progress.phases.map((ph) => (
                    <li key={`${ph.number}-${ph.start}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">
                        <span className="text-muted">Fase {ph.number} · </span>
                        {ph.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {STATE[ph.state]}
                        {ph.state === "active" && ` · ${ph.percent}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {/* Ajuste manual (opcional): vacío = cálculo automático con las tareas */}
              <div className="rounded-2xl bg-ink/[0.04] p-3 space-y-2">
                <p className="text-sm">Ajuste manual (opcional)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[11px] text-muted">Porcentaje que ve el cliente</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        key={`pct-${s.progressOverride ?? "auto"}`}
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={s.progressOverride ?? ""}
                        placeholder={`Automático: ${s.progress.percent}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === "" && s.progressOverride !== null) saveManual({ progressOverride: null });
                          else if (v !== "" && Number(v) !== s.progressOverride) saveManual({ progressOverride: Number(v) });
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="field w-full rounded-lg px-2.5 py-1.5 text-sm"
                      />
                      <span className="text-sm text-muted">%</span>
                    </div>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-muted">Fecha estimada de entrega</span>
                    <input
                      key={`end-${s.estimatedEnd ?? "auto"}`}
                      type="date"
                      defaultValue={s.estimatedEnd?.slice(0, 10) ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" && s.estimatedEnd) saveManual({ estimatedEnd: null });
                        else if (v && v !== s.estimatedEnd?.slice(0, 10)) saveManual({ estimatedEnd: v });
                      }}
                      className="field w-full rounded-lg px-2.5 py-1.5 text-sm"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    Automático hoy: {s.progress.percent}%
                    {s.progress.end &&
                      ` · entrega ${new Date(s.progress.end).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`}
                  </span>
                  {(s.progressOverride !== null || s.estimatedEnd) && (
                    <button onClick={() => saveManual({ progressOverride: null, estimatedEnd: null })} className="hover:text-ink">
                      Volver al automático
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs text-muted max-w-md">
                  Por defecto se actualiza solo con el estado de las tareas: al marcar una fase como terminada, sube el avance.
                  Las fases en curso avanzan según los días que llevan. La fecha es la de fin de la última tarea.
                </p>
                {s.progress.phases.some((p) => p.state !== "done") && (
                  <Button tone="ghost" onClick={completeAll}>
                    Marcar todo como terminado
                  </Button>
                )}
              </div>
            </section>

            <PortalLinksEditor kind="delivery" projectId={projectId} links={s.links} phases={phaseOptions} notify={notify} onChange={setLinks} />

            <SupplierQuotesEditor
              projectId={projectId}
              quotes={s.supplierQuotes}
              notify={notify}
              onChange={(supplierQuotes) => setS((x) => (x ? { ...x, supplierQuotes } : x))}
            />

            {/* Precio (interno: el cliente solo ve lo que paga) */}
            <section className="space-y-3">
              <h3 className="text-base">Precio del proyecto</h3>
              <div className="rounded-2xl bg-ink/[0.04] p-4 space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs text-muted">Precio completo, sin IVA (MXN)</span>
                  <input
                    key={`price-${s.priceTotal ?? total}`}
                    type="number"
                    min={0}
                    defaultValue={s.priceTotal ?? total}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v !== (s.priceTotal ?? total)) savePrice({ priceTotal: v });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="field w-full rounded-xl px-3 py-2 text-sm"
                  />
                </label>
                <p className="text-xs text-muted">
                  Se reparte entre los pagos pendientes y no cambia con el IVA. Activa <span className="text-ink">+ IVA</span> en
                  el pago que lo lleve: el cliente lo ve con IVA incluido, sin desglose. En total paga{" "}
                  <span className="text-ink">{formatMoney(clientTotal)}</span>.
                </p>
              </div>
            </section>

            {/* Pagos */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base">Pagos</h3>
                <span className="text-xs text-muted">
                  {formatMoney(paid)} de {formatMoney(total)} pagado
                </span>
              </div>
              {s.payments.length === 0 && (
                <div className="rounded-2xl bg-ink/[0.04] p-4 text-sm flex flex-wrap items-center justify-between gap-3">
                  <span className="text-muted">Sin pagos todavía.</span>
                  {s.hasApprovedQuote && <Button onClick={() => addPayment(true)}>Crear anticipo y finiquito desde la propuesta</Button>}
                </div>
              )}
              <ul className="space-y-2">
                {s.payments.map((p) => (
                  <li key={p.id} className={`field rounded-2xl p-3 grid gap-2 sm:grid-cols-[1fr_110px_190px] items-center ${p.paidAt ? "opacity-80" : ""}`}>
                    <input
                      defaultValue={p.label}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== p.label && patchPayment(p.id, { label: e.target.value })}
                      className="field rounded-lg px-2.5 py-1.5 text-sm"
                      aria-label="Concepto"
                    />
                    <input
                      key={`${p.id}-${p.amount}`}
                      type="number"
                      min={0}
                      defaultValue={p.amount}
                      onBlur={(e) => Number(e.target.value) !== p.amount && patchPayment(p.id, { amount: Number(e.target.value) })}
                      className="field rounded-lg px-2.5 py-1.5 text-sm tabular-nums"
                      aria-label="Monto"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      Vence
                      <input
                        type="date"
                        value={day(p.dueDate)}
                        onChange={(e) => patchPayment(p.id, { dueDate: e.target.value || null })}
                        className="field rounded-lg px-2 py-1 text-xs min-w-0 flex-1"
                      />
                    </label>
                    <div className="sm:col-span-3 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        onClick={() => patchPayment(p.id, { paidAt: p.paidAt ? null : todayIso })}
                        className={`rounded-full px-3 py-1 ${p.paidAt ? "bg-green-600/15 text-green-700 dark:text-green-400" : "bg-button hover:bg-button-hover text-ink"}`}
                      >
                        {p.paidAt ? "✓ Pagado" : "Marcar pagado"}
                      </button>
                      {p.paidAt && (
                        <label className="flex items-center gap-1.5 text-muted">
                          el
                          <input
                            type="date"
                            value={day(p.paidAt)}
                            onChange={(e) => e.target.value && patchPayment(p.id, { paidAt: e.target.value })}
                            className="field rounded-lg px-2 py-1 text-xs"
                          />
                        </label>
                      )}
                      <button
                        onClick={() => patchPayment(p.id, { withIva: !p.withIva })}
                        title={`Con IVA el cliente paga ${formatMoney(clientAmount(p.amount, true))}`}
                        className={`rounded-full px-3 py-1 ${p.withIva ? "bg-ink text-paper" : "bg-button hover:bg-button-hover text-ink"}`}
                      >
                        {p.withIva ? `✓ IVA · cliente paga ${formatMoney(clientAmount(p.amount, true))}` : "+ IVA"}
                      </button>
                      {p.paidAt && s.portalToken && (
                        <a href={`/c/${s.portalToken}/recibo/${p.id}`} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
                          Recibo ↗
                        </a>
                      )}
                      <button onClick={() => deletePayment(p.id)} className="ml-auto text-muted hover:text-red-600">
                        Quitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted">
                  Montos sin IVA; los que tienen IVA, el cliente los ve con IVA incluido. Siempre ve tus datos de transferencia y el
                  recibo de cada pago marcado como pagado.
                </p>
                <Button onClick={() => addPayment(false)}>+ Pago</Button>
              </div>
            </section>

            {/* Facturación */}
            <section className="space-y-4">
              <h3 className="text-base">Facturación</h3>
              <div className="rounded-2xl bg-ink/[0.04] p-4">
                <p className="text-sm">Constancia de situación fiscal</p>
                {certificates.length === 0 ? (
                  <p className="text-xs text-muted mt-1">
                    El cliente aún no la sube. Si requiere factura, la sube desde su portal; si no, descarga el recibo de cada pago.
                  </p>
                ) : (
                  <ul className="mt-2 text-sm divide-y divide-line">
                    {certificates.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 py-2">
                        <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                          {d.name}
                        </a>
                        <span className="text-xs text-muted shrink-0">{shortDate(d.createdAt)}</span>
                        <button onClick={() => deleteDocument(d)} className="text-xs text-muted hover:text-red-600 shrink-0">
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl bg-ink/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">Facturas para el cliente</p>
                  <Button onClick={() => invoiceInput.current?.click()} disabled={uploadingInvoices > 0}>
                    {uploadingInvoices > 0 ? "Subiendo…" : "+ Subir factura (PDF/XML)"}
                  </Button>
                  <input
                    ref={invoiceInput}
                    type="file"
                    multiple
                    accept="application/pdf,.xml,text/xml,application/xml"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length) uploadInvoices(files);
                      e.target.value = "";
                    }}
                  />
                </div>
                {invoices.length === 0 ? (
                  <p className="text-xs text-muted mt-1">Las que subas aparecen en el portal para que el cliente las descargue.</p>
                ) : (
                  <ul className="mt-2 text-sm divide-y divide-line">
                    {invoices.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 py-2">
                        <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                          {d.name}
                        </a>
                        <span className="text-xs text-muted shrink-0">{shortDate(d.createdAt)}</span>
                        <button onClick={() => deleteDocument(d)} className="text-xs text-muted hover:text-red-600 shrink-0">
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <PortalLinksEditor kind="brand" projectId={projectId} links={s.links} phases={phaseOptions} notify={notify} onChange={setLinks} />
          </div>
        )}
      </div>
    </div>
  );
}
