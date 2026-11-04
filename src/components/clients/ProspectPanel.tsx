"use client";

import { useEffect, useState } from "react";
import { PROSPECT_STAGES, Prospect, ProspectStage, QUOTE_STATUS_LABELS } from "@/lib/quotes";
import { Button, DeleteButton } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

const FIELDS: { key: keyof Prospect; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "contact", label: "Contacto", placeholder: "Nombre de quien escribió" },
  { key: "phone", label: "Teléfono", placeholder: "WhatsApp" },
  { key: "email", label: "Correo", placeholder: "correo@marca.com" },
  { key: "city", label: "Ciudad", placeholder: "Querétaro" },
  { key: "category", label: "Giro", placeholder: "Cafetería de especialidad, matcha bar…" },
  { key: "source", label: "Cómo llegó", placeholder: "Instagram, recomendación…" },
  { key: "budget", label: "Presupuesto", placeholder: "Lo que mencionó, si lo dijo" },
  {
    key: "needs",
    label: "Qué necesita",
    placeholder: "Logo, vasos, bolsa de delivery, menú, redes… Claude usa esto para sugerir la cotización.",
    multiline: true,
  },
  { key: "notes", label: "Notas internas", placeholder: "Lo que no ve el cliente", multiline: true },
];

export function quoteUrl(token: string) {
  return `${window.location.origin}/p/${token}`;
}

export default function ProspectPanel({
  prospect,
  notify,
  onChange,
  onDeleted,
  onClose,
  onEditQuote,
  onReload,
}: {
  prospect: Prospect;
  notify: Notify;
  onChange: (p: Prospect) => void;
  onDeleted: () => void;
  onClose: () => void;
  onEditQuote: (quoteId: string) => void;
  onReload: () => void;
}) {
  const [draft, setDraft] = useState<Prospect>(prospect);
  useEffect(() => setDraft(prospect), [prospect]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(fields: Partial<Prospect>) {
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) onChange(await res.json());
    else notify("No se pudo guardar.", "error");
  }

  function commit(key: keyof Prospect) {
    if ((draft[key] ?? "") !== (prospect[key] ?? "")) save({ [key]: draft[key] } as Partial<Prospect>);
  }

  async function newQuote(fromQuoteId?: string) {
    const res = await fetch(`/api/prospects/${prospect.id}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fromQuoteId ? { fromQuoteId } : {}),
    });
    if (!res.ok) return notify("No se pudo crear la cotización.", "error");
    const q = await res.json();
    onReload();
    onEditQuote(q.id);
  }

  async function remove() {
    const res = await fetch(`/api/prospects/${prospect.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else notify("No se pudo eliminar.", "error");
  }

  const quotes = prospect.quotes ?? [];

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col glass-overlay rounded-3xl sm:m-2">
      <div className="flex items-center justify-between px-8 pt-6">
        <span className="text-sm text-muted">Prospecto</span>
        <button onClick={onClose} className="h-8 w-8 rounded-xl bg-button hover:bg-button-hover text-ink" aria-label="Cerrar">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-8 pb-10 pt-3 space-y-8">
        <input
          value={draft.brandName}
          onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
          onBlur={() => draft.brandName.trim() && commit("brandName")}
          className="w-full bg-transparent text-3xl focus:outline-none"
        />

        <div className="flex flex-wrap gap-1.5">
          {PROSPECT_STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => save({ stage: s.key as ProspectStage })}
              className={`text-xs px-3 py-1.5 rounded-xl ${
                prospect.stage === s.key ? "bg-accent text-accent-fg" : "bg-button hover:bg-button-hover text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {prospect.stage === "lost" && (
          <input
            value={draft.lostReason ?? ""}
            onChange={(e) => setDraft({ ...draft, lostReason: e.target.value })}
            onBlur={() => commit("lostReason")}
            placeholder="¿Por qué se perdió? (precio, tiempos, no respondió…)"
            className="field w-full rounded-xl px-4 py-2.5 text-sm"
          />
        )}

        <section className="space-y-2">
          {FIELDS.map((f) => (
            <label key={f.key} className={`grid gap-1 ${f.multiline ? "" : "sm:grid-cols-[120px_1fr] sm:items-center"}`}>
              <span className="text-xs text-muted">{f.label}</span>
              {f.multiline ? (
                <textarea
                  value={(draft[f.key] as string) ?? ""}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  onBlur={() => commit(f.key)}
                  rows={f.key === "needs" ? 5 : 3}
                  placeholder={f.placeholder}
                  className="field w-full rounded-2xl px-4 py-3 text-sm resize-y"
                />
              ) : (
                <input
                  value={(draft[f.key] as string) ?? ""}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  onBlur={() => commit(f.key)}
                  placeholder={f.placeholder}
                  className="field w-full rounded-xl px-3 py-2 text-sm"
                />
              )}
            </label>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg">Cotizaciones</h3>
            <Button tone="primary" onClick={() => newQuote()}>
              + Nueva cotización
            </Button>
          </div>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted">
              Aún no hay cotización. Al crearla parte de tu plantilla y puedes pedirle a Claude que sugiera alcance, tiempos y
              precio con lo que necesita el prospecto.
            </p>
          ) : (
            <ul className="space-y-2">
              {quotes.map((q) => (
                <li key={q.id} className="rounded-2xl bg-ink/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">
                      {QUOTE_STATUS_LABELS[q.status]}
                      {q.status === "approved" && q.approvedOption && ` · Opción ${q.approvedOption}`}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(q.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {q.viewCount > 0
                      ? `La abrió ${q.viewCount} ${q.viewCount === 1 ? "vez" : "veces"} · última: ${new Date(q.lastViewedAt!).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`
                      : q.status === "draft"
                      ? "Borrador: el cliente aún no la puede abrir"
                      : "El cliente aún no la abre"}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button onClick={() => onEditQuote(q.id)}>Editar</Button>
                    {q.status !== "draft" && (
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(quoteUrl(q.token));
                          notify("Liga copiada");
                        }}
                      >
                        Copiar liga
                      </Button>
                    )}
                    <Button tone="ghost" onClick={() => window.open(quoteUrl(q.token), "_blank")}>
                      Ver ↗
                    </Button>
                    <Button tone="ghost" onClick={() => newQuote(q.id)}>
                      Duplicar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pt-4">
          <DeleteButton
            label="Eliminar prospecto"
            confirmText={`¿Eliminar a "${prospect.brandName}" y sus cotizaciones?`}
            onConfirm={remove}
          />
        </div>
      </div>
    </aside>
  );
}
