"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_EXTRAS,
  QUOTE_STATUS_LABELS,
  Quote,
  QuoteContent,
  QuoteOption,
  QuoteStatus,
  StudioWork,
  formatMoney,
} from "@/lib/quotes";
import { Button } from "../branding/ui";
import { quoteUrl } from "./ProspectPanel";

type Notify = (message: string, tone?: "ok" | "error") => void;

interface Suggestion {
  reasoning: string;
  summary: string;
  category: string;
  touchpoints: string;
  weeks: string;
  phase1Focus: string;
  applications: string[];
  options: QuoteOption[];
  extras: { name: string; price: string }[];
  accent: string;
  dark: string;
}

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export default function QuoteEditor({ quoteId, notify, onClose }: { quoteId: string; notify: Notify; onClose: () => void }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [content, setContent] = useState<QuoteContent | null>(null);
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [works, setWorks] = useState<StudioWork[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef<QuoteContent | null>(null);

  useEffect(() => {
    fetch(`/api/quotes/${quoteId}`)
      .then((r) => r.json())
      .then((q: Quote) => {
        setQuote(q);
        setContent(q.content);
        latest.current = q.content;
      })
      .catch(() => notify("No se pudo abrir la cotización.", "error"));
  }, [quoteId, notify]);

  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then((s) => setWorks(s.works ?? []))
      .catch(() => {});
  }, []);

  async function flush() {
    clearTimeout(timer.current);
    if (!latest.current) return;
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: latest.current }),
    });
    if (res.ok) {
      setSaving("saved");
      setPreviewKey((k) => k + 1);
    } else notify("No se pudo guardar la cotización.", "error");
  }

  function update(fn: (c: QuoteContent) => QuoteContent) {
    setContent((c) => {
      if (!c) return c;
      const next = fn(c);
      latest.current = next;
      return next;
    });
    setSaving("pending");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }

  async function close() {
    if (saving === "pending") await flush();
    onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  async function setStatus(status: QuoteStatus) {
    if (saving === "pending") await flush();
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return notify("No se pudo cambiar el estado.", "error");
    setQuote(await res.json());
    if (status === "sent") {
      navigator.clipboard.writeText(quoteUrl(quote!.token)).catch(() => {});
      notify("Lista para enviar: liga copiada");
    }
  }

  async function suggest() {
    if (saving === "pending") await flush();
    setSuggesting(true);
    setSuggestion(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/suggest`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "No se pudo sugerir.");
      setSuggestion(body);
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo sugerir.", "error");
    }
    setSuggesting(false);
  }

  function applySuggestion(s: Suggestion) {
    update((c) => ({
      ...c,
      summary: s.summary || c.summary,
      category: s.category || c.category,
      touchpoints: s.touchpoints || c.touchpoints,
      weeks: s.weeks || c.weeks,
      accent: /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : c.accent,
      dark: /^#[0-9a-f]{6}$/i.test(s.dark) ? s.dark : c.dark,
      phases: c.phases.map((ph, i) =>
        i === 0 && s.phase1Focus
          ? { ...ph, items: [s.phase1Focus, ...ph.items.slice(1)] }
          : i === 2 && s.applications.length
          ? { ...ph, items: s.applications }
          : ph
      ),
      options: s.options.length ? s.options : c.options,
      extras: s.extras,
    }));
    setSuggestion(null);
    notify("Sugerencia aplicada; revisa y ajusta lo que necesites");
  }

  if (!quote || !content) {
    return (
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
        <p className="glass-overlay rounded-2xl px-6 py-4 text-sm">Abriendo cotización…</p>
      </div>
    );
  }

  const url = quoteUrl(quote.token);
  const field = "field w-full rounded-xl px-3 py-2 text-sm";
  const area = "field w-full rounded-2xl px-3 py-2.5 text-sm resize-y";

  return (
    <div className="fixed inset-0 z-50 flex bg-paper">
      {/* Edición */}
      <div className="w-full lg:w-[520px] shrink-0 flex flex-col border-r border-line">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-line">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              {QUOTE_STATUS_LABELS[quote.status]} · {saving === "pending" ? "Guardando…" : saving === "saved" ? "Guardado" : "Sin cambios"}
            </p>
            <h2 className="text-lg truncate">Cotización · {content.brandName}</h2>
          </div>
          <Button onClick={close}>Cerrar</Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Acciones */}
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {quote.status === "draft" ? (
                <Button tone="primary" onClick={() => setStatus("sent")}>
                  Lista para enviar · copiar liga
                </Button>
              ) : (
                <>
                  <Button
                    tone="primary"
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      notify("Liga copiada");
                    }}
                  >
                    Copiar liga
                  </Button>
                  {quote.status !== "approved" && (
                    <Button tone="ghost" onClick={() => setStatus("draft")}>
                      Volver a borrador
                    </Button>
                  )}
                </>
              )}
              <Button tone="ghost" onClick={() => window.open(url, "_blank")}>
                Abrir ↗
              </Button>
            </div>
            {quote.status === "approved" && (
              <p className="text-sm rounded-2xl bg-ink/[0.05] p-4">
                Aprobada por <strong className="font-medium">{quote.approvedName}</strong>
                {quote.approvedEmail && ` (${quote.approvedEmail})`} · Opción {quote.approvedOption} ·{" "}
                {new Date(quote.approvedAt!).toLocaleString("es-MX", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
                {quote.approvedNote && <span className="block mt-2 text-muted">“{quote.approvedNote}”</span>}
              </p>
            )}
            <div className="rounded-2xl bg-ink/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">Sugerir con Claude</p>
                  <p className="text-xs text-muted">Alcance, aplicaciones, tiempos y precio con tu tabulador y lo que necesita el prospecto.</p>
                </div>
                <Button tone="primary" onClick={suggest} disabled={suggesting}>
                  {suggesting ? "Pensando…" : "Sugerir"}
                </Button>
              </div>
              {suggestion && (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  <p className="text-xs text-muted">Para ti (el cliente no lo ve)</p>
                  <p className="text-sm whitespace-pre-wrap">{suggestion.reasoning}</p>
                  <ul className="text-sm space-y-1">
                    {suggestion.options.map((o) => (
                      <li key={o.key}>
                        <strong className="font-medium">
                          {o.key} · {o.name}
                        </strong>{" "}
                        — {formatMoney(o.price)} MXN · {o.duration}
                        {o.recommended && " · recomendada"}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted">Aplicaciones: {suggestion.applications.join(", ")}</p>
                  <div className="flex gap-2">
                    <Button tone="primary" onClick={() => applySuggestion(suggestion)}>
                      Aplicar a la cotización
                    </Button>
                    <Button tone="ghost" onClick={() => setSuggestion(null)}>
                      Descartar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <Group title="Portada">
            <Row label="Marca">
              <input
                value={content.brandName}
                onChange={(e) => update((c) => ({ ...c, brandName: e.target.value }))}
                className={field}
              />
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Título, línea 1">
                <input value={content.brandLine1} onChange={(e) => update((c) => ({ ...c, brandLine1: e.target.value }))} className={field} />
              </Row>
              <Row label="Línea 2 (color)">
                <input value={content.brandLine2} onChange={(e) => update((c) => ({ ...c, brandLine2: e.target.value }))} className={field} />
              </Row>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Color de acento">
                <ColorInput value={content.accent} onChange={(v) => update((c) => ({ ...c, accent: v }))} />
              </Row>
              <Row label="Color del cierre">
                <ColorInput value={content.dark} onChange={(v) => update((c) => ({ ...c, dark: v }))} />
              </Row>
            </div>
            <Row label="Resumen">
              <input value={content.summary} onChange={(e) => update((c) => ({ ...c, summary: e.target.value }))} className={field} />
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Servicio">
                <input value={content.service} onChange={(e) => update((c) => ({ ...c, service: e.target.value }))} className={field} />
              </Row>
              <Row label="Fecha de emisión">
                <input
                  type="date"
                  value={content.issuedAt.slice(0, 10)}
                  onChange={(e) => e.target.value && update((c) => ({ ...c, issuedAt: new Date(`${e.target.value}T12:00:00`).toISOString() }))}
                  className={field}
                />
              </Row>
            </div>
            <Row label="Categoría (“En una categoría como …”)">
              <input value={content.category} onChange={(e) => update((c) => ({ ...c, category: e.target.value }))} className={field} />
            </Row>
            <Row label="Dónde vivirá la marca">
              <input value={content.touchpoints} onChange={(e) => update((c) => ({ ...c, touchpoints: e.target.value }))} className={field} />
            </Row>
            <Row label="Semanas de trabajo">
              <input value={content.weeks} onChange={(e) => update((c) => ({ ...c, weeks: e.target.value }))} className={field} />
            </Row>
          </Group>

          <Group title="Fases">
            {content.phases.map((ph, i) => (
              <div key={i} className="rounded-2xl bg-ink/[0.03] p-3 space-y-2">
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <input
                    value={ph.name}
                    onChange={(e) => update((c) => ({ ...c, phases: c.phases.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)) }))}
                    className={field}
                  />
                  <input
                    value={ph.duration}
                    onChange={(e) => update((c) => ({ ...c, phases: c.phases.map((p, j) => (j === i ? { ...p, duration: e.target.value } : p)) }))}
                    className={field}
                  />
                </div>
                <input
                  value={ph.subtitle}
                  onChange={(e) => update((c) => ({ ...c, phases: c.phases.map((p, j) => (j === i ? { ...p, subtitle: e.target.value } : p)) }))}
                  className={field}
                />
                <textarea
                  value={ph.description}
                  rows={3}
                  onChange={(e) => update((c) => ({ ...c, phases: c.phases.map((p, j) => (j === i ? { ...p, description: e.target.value } : p)) }))}
                  className={area}
                />
                <LinesArea
                  label="Puntos (uno por línea)"
                  value={ph.items}
                  onChange={(items) => update((c) => ({ ...c, phases: c.phases.map((p, j) => (j === i ? { ...p, items } : p)) }))}
                />
              </div>
            ))}
          </Group>

          {works.length > 0 && (
            <Group
              title="Trabajos relacionados"
              action={
                (content.workIds?.length ?? 0) > 0 && (
                  <Button tone="ghost" onClick={() => update((c) => ({ ...c, workIds: [] }))}>
                    Mostrar todos
                  </Button>
                )
              }
            >
              <p className="text-xs text-muted">
                {(content.workIds?.length ?? 0) > 0
                  ? `Se muestran ${works.filter((w) => content.workIds!.includes(w.id)).length} de ${works.length}. Toca para agregar o quitar.`
                  : `Se muestran todos (${works.length}). Toca los que van con este cliente para mostrar solo esos.`}{" "}
                Las fotos se suben en Datos del estudio.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {works.map((w) => {
                  const on = !!content.workIds?.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() =>
                        update((c) => {
                          const ids = c.workIds ?? [];
                          return { ...c, workIds: on ? ids.filter((x) => x !== w.id) : [...ids, w.id] };
                        })
                      }
                      className={`relative aspect-[4/5] rounded-xl overflow-hidden text-left border-2 transition-opacity ${
                        on ? "border-ink" : "border-transparent"
                      } ${(content.workIds?.length ?? 0) > 0 && !on ? "opacity-45 hover:opacity-80" : ""}`}
                      style={{ background: w.tone }}
                      title={w.name}
                    >
                      {w.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-5 text-[11px] leading-tight text-white truncate">
                        {w.name}
                      </span>
                      {on && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-ink text-paper text-[11px] flex items-center justify-center">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Group>
          )}

          <Group
            title="Inversión"
            action={
              content.options.length < 3 && (
                <Button
                  onClick={() =>
                    update((c) => ({
                      ...c,
                      options: [
                        ...c.options,
                        {
                          key: String.fromCharCode(65 + c.options.length),
                          name: "Nueva opción",
                          phases: "Fase 01 + 02",
                          price: 23000,
                          duration: "3–4 semanas",
                          features: [],
                          note: "",
                          recommended: false,
                        },
                      ],
                    }))
                  }
                >
                  + Opción
                </Button>
              )
            }
          >
            <p className="text-xs text-muted">Con una opción se muestra “Un alcance. Un precio.”; con dos o tres, “Alcance por paquete”.</p>
            {content.options.map((o, i) => {
              const set = (patch: Partial<QuoteOption>) =>
                update((c) => ({ ...c, options: c.options.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
              return (
                <div key={i} className="rounded-2xl bg-ink/[0.03] p-3 space-y-2">
                  <div className="grid grid-cols-[48px_1fr] gap-2">
                    <input value={o.key} onChange={(e) => set({ key: e.target.value.slice(0, 3) })} className={field} />
                    <input value={o.name} onChange={(e) => set({ name: e.target.value })} className={field} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={o.phases} onChange={(e) => set({ phases: e.target.value })} className={field} />
                    <input
                      type="number"
                      step={500}
                      value={o.price}
                      onChange={(e) => set({ price: Number(e.target.value) || 0 })}
                      className={field}
                    />
                    <input value={o.duration} onChange={(e) => set({ duration: e.target.value })} className={field} />
                  </div>
                  <LinesArea label="Incluye (uno por línea)" value={o.features} onChange={(features) => set({ features })} />
                  {content.options.length > 1 && (
                    <input value={o.note} onChange={(e) => set({ note: e.target.value })} placeholder="Para quién es esta opción" className={field} />
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={o.recommended}
                        onChange={() => update((c) => ({ ...c, options: c.options.map((x, j) => ({ ...x, recommended: j === i })) }))}
                      />
                      Recomendada
                    </label>
                    {content.options.length > 1 && (
                      <button
                        onClick={() => update((c) => ({ ...c, options: c.options.filter((_, j) => j !== i) }))}
                        className="text-muted hover:text-red-600"
                      >
                        Quitar opción
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <Row label="Servicios adicionales (nombre | precio, uno por línea)">
              <LinesArea
                value={content.extras.map((e) => `${e.name} | ${e.price}`)}
                onChange={(ls) =>
                  update((c) => ({
                    ...c,
                    extras: ls.map((l) => {
                      const [name, ...rest] = l.split("|");
                      return { name: name.trim(), price: rest.join("|").trim() };
                    }),
                  }))
                }
              />
            </Row>
            {content.extras.length === 0 && (
              <Button tone="ghost" onClick={() => update((c) => ({ ...c, extras: DEFAULT_EXTRAS.map((e) => ({ ...e })) }))}>
                Agregar los extras del tabulador
              </Button>
            )}
          </Group>

          <Group title="Condiciones">
            <div className="grid grid-cols-4 gap-2">
              <NumberRow label="Vigencia (días)" value={content.validDays} onChange={(v) => update((c) => ({ ...c, validDays: v }))} />
              <NumberRow label="Descuento hasta (días)" value={content.earlyDays} onChange={(v) => update((c) => ({ ...c, earlyDays: v }))} />
              <NumberRow label="Descuento %" value={content.earlyDiscount} onChange={(v) => update((c) => ({ ...c, earlyDiscount: v }))} />
              <NumberRow label="Anticipo %" value={content.advancePercent} onChange={(v) => update((c) => ({ ...c, advancePercent: Math.min(100, v) }))} />
            </div>
            {content.notes.map((n, i) => (
              <div key={i} className="space-y-1">
                <input
                  value={n.title}
                  onChange={(e) => update((c) => ({ ...c, notes: c.notes.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) }))}
                  className={field}
                />
                <textarea
                  value={n.body}
                  rows={3}
                  onChange={(e) => update((c) => ({ ...c, notes: c.notes.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) }))}
                  className={area}
                />
              </div>
            ))}
            <p className="text-xs text-muted">
              En las notas puedes usar {"{validDays}"}, {"{earlyDays}"}, {"{earlyDiscount}"}, {"{advancePercent}"} y {"{balancePercent}"}; se
              llenan solos.
            </p>
          </Group>
        </div>
      </div>

      {/* Vista previa */}
      <div className="hidden lg:flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <span className="text-sm text-muted truncate">{url}</span>
          <span className="text-xs text-muted">Vista previa · se actualiza al guardar</span>
        </div>
        <iframe key={previewKey} src={`/p/${quote.token}`} className="flex-1 w-full bg-white" title="Vista previa de la propuesta" />
      </div>
    </div>
  );
}

function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="field w-full rounded-xl px-3 py-2 text-sm"
      />
    </Row>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded-lg bg-transparent" />
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field w-full rounded-xl px-3 py-2 text-sm" />
    </div>
  );
}

// Lista editable como texto, una línea por elemento
function LinesArea({ label, value, onChange }: { label?: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  const joined = value.join("\n");
  useEffect(() => {
    if (lines(text).join("\n") !== joined) setText(joined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);
  const el = (
    <textarea
      value={text}
      rows={Math.min(10, Math.max(3, value.length + 1))}
      onChange={(e) => {
        setText(e.target.value);
        onChange(lines(e.target.value));
      }}
      className="field w-full rounded-2xl px-3 py-2.5 text-sm resize-y"
    />
  );
  return label ? <Row label={label}>{el}</Row> : el;
}
