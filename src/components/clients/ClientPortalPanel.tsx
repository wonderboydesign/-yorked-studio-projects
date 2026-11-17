"use client";

import { useCallback, useEffect, useState } from "react";
import { PaymentRow, Progress } from "@/lib/portal";
import { formatMoney } from "@/lib/quotes";
import { Button } from "../branding/ui";

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
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const STATE = { done: "✓ Terminada", active: "En curso", upcoming: "Por venir" } as Record<string, string>;

// Portal del cliente de un proyecto: la liga para mandarle, una vista previa
// del avance (sale de las tareas) y los pagos que se marcan como pagados
export default function ClientPortalPanel({ projectId, notify, onClose }: { projectId: string; notify: Notify; onClose: () => void }) {
  const [s, setS] = useState<PortalState | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function addPayment(fromQuote = false) {
    const res = await fetch(`/api/projects/${projectId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fromQuote ? { fromQuote: true } : { label: "Pago adicional", amount: 0 }),
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

            {/* Avance */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base">Avance que ve el cliente</h3>
                <span className="text-3xl tracking-[-0.02em] tabular-nums">{s.progress.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${s.progress.percent}%` }} />
              </div>
              {s.progress.phases.length === 0 ? (
                <p className="text-xs text-muted">
                  Este proyecto no tiene fases todavía: calendarízalo desde el prospecto ganado (Clientes) o nombra tareas como
                  “Fase 01 Nombre”.
                </p>
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
              <p className="text-xs text-muted">
                Se actualiza solo con el estado de las tareas: al marcar una fase como terminada, sube el avance. Las fases en
                curso avanzan según los días que llevan.
              </p>
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
                      <button onClick={() => deletePayment(p.id)} className="ml-auto text-muted hover:text-red-600">
                        Quitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted">Montos en MXN sin IVA. El cliente ve los datos de transferencia mientras haya algo pendiente.</p>
                <Button onClick={() => addPayment(false)}>+ Pago</Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
