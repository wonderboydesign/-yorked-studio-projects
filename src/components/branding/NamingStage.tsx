"use client";

import { useMemo, useState } from "react";
import { BrandItem, NAME_STATUSES, NAME_STYLES, NameData, NameStyle, nameStyleLabel } from "@/lib/branding";
import { useBrand } from "./BrandContext";
import { AutoText, Button, DeleteButton, InlineInput, InlineTextarea, Panel, Pills, SectionTitle } from "./ui";

type NameStatus = (typeof NAME_STATUSES)[number]["key"];
type Filter = "all" | NameStatus;

const STATUS_ORDER: Record<string, number> = { chosen: 0, shortlist: 1, explore: 2, discarded: 3 };

function nameData(item: BrandItem) {
  return (item.data ?? {}) as NameData;
}

function statusOf(item: BrandItem): NameStatus {
  return (item.status as NameStatus) ?? "explore";
}

export default function NamingStage() {
  const { data, patchWorkspace, patchNaming, addItem, generateNames } = useBrand();
  const naming = data.workspace.naming ?? {};
  const names = data.items.filter((i) => i.kind === "name");
  const [filter, setFilter] = useState<Filter>("all");
  const [styleFilter, setStyleFilter] = useState<NameStyle | null>(null);
  const [count, setCount] = useState(8);
  const [direction, setDirection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMeaning, setNewMeaning] = useState("");

  const hasInput =
    !!data.workspace.brief?.trim() ||
    !!data.workspace.context?.trim() ||
    !!data.workspace.briefAnalysis ||
    !!naming.convey?.trim() ||
    data.items.some((i) => i.section === "brief" && i.kind === "comment");

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byStyle: Record<string, number> = {};
    for (const n of names) {
      byStatus[statusOf(n)] = (byStatus[statusOf(n)] ?? 0) + 1;
      const st = nameData(n).style;
      if (st && statusOf(n) !== "discarded") byStyle[st] = (byStyle[st] ?? 0) + 1;
    }
    return { byStatus, byStyle };
  }, [names]);

  const shown = names
    .filter((n) => (filter === "all" ? true : statusOf(n) === filter))
    .filter((n) => !styleFilter || nameData(n).style === styleFilter)
    .sort((a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)] || a.order - b.order);

  const finalists = names
    .filter((n) => statusOf(n) === "chosen" || statusOf(n) === "shortlist")
    .sort((a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)]);

  function toggleStyle(key: NameStyle) {
    const current = naming.styles ?? [];
    patchNaming({ styles: current.includes(key) ? current.filter((s) => s !== key) : [...current, key] });
  }

  async function generate() {
    setGenerating(true);
    const ok = await generateNames(count, direction);
    if (ok) {
      setDirection("");
      setFilter("all");
    }
    setGenerating(false);
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const title = newName.trim();
    if (!title) return;
    await addItem({
      section: "naming",
      kind: "name",
      title,
      status: "explore",
      data: newMeaning.trim() ? { meaning: newMeaning.trim() } : undefined,
    });
    setNewName("");
    setNewMeaning("");
  }

  function disableStage() {
    if (window.confirm("¿Quitar la etapa de naming de este proyecto? Los nombres se guardan y vuelven si la activas otra vez.")) {
      patchNaming({ enabled: false });
      if (data.workspace.stage === "naming") patchWorkspace({ stage: "research" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Criterios */}
        <Panel>
          <SectionTitle
            title="Criterios del nombre"
            hint="Lo que el nombre debe lograr. Claude los toma en cuenta al sugerir."
            action={
              <Button tone="ghost" onClick={disableStage}>
                Quitar etapa
              </Button>
            }
          />
          <Label>Qué debe transmitir</Label>
          <AutoText
            value={naming.convey ?? null}
            onSave={(convey) => patchNaming({ convey })}
            rows={3}
            placeholder="Ej. cercanía de barrio, ritual del matcha, algo que se diga fácil en la barra…"
          />
          <Label className="mt-5">Estilos que nos interesan</Label>
          <div className="flex flex-wrap gap-1.5">
            {NAME_STYLES.map((s) => {
              const on = naming.styles?.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleStyle(s.key)}
                  title={s.hint}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    on ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-1.5">Si no eliges ninguno, Claude mezcla estilos.</p>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 mt-5">
            <Field label="Idioma">
              <InlineInput
                value={naming.languages ?? null}
                onSave={(languages) => patchNaming({ languages })}
                placeholder="Español, inglés, mezcla…"
                className="text-sm py-1"
              />
            </Field>
            <Field label="Largo">
              <InlineInput
                value={naming.length ?? null}
                onSave={(length) => patchNaming({ length })}
                placeholder="Una palabra, 2 sílabas…"
                className="text-sm py-1"
              />
            </Field>
            <Field label="Evitar">
              <InlineInput
                value={naming.avoid ?? null}
                onSave={(avoid) => patchNaming({ avoid })}
                placeholder="Palabras, sonidos o marcas a evitar"
                className="text-sm py-1"
              />
            </Field>
            <Field label="Notas">
              <InlineInput
                value={naming.notes ?? null}
                onSave={(notes) => patchNaming({ notes })}
                placeholder="Lo que dijo el cliente, restricciones…"
                className="text-sm py-1"
              />
            </Field>
          </div>
        </Panel>

        {/* Generar y agregar */}
        <Panel className="flex flex-col">
          <SectionTitle
            title="Sugerencias de Claude"
            hint="Parte del brief, el concepto elegido, el research y la competencia. Aprende de lo que pongas en shortlist o descartes."
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Cuántos</span>
            {[5, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`text-xs w-8 h-8 rounded-full border ${
                  count === n ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="Opcional: “más cortos”, “que suenen japoneses”, “variaciones de Koru”…"
            className="mt-3 w-full field rounded-full px-4 py-2 text-sm focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button tone="primary" onClick={generate} disabled={!hasInput || generating}>
              {generating ? "Pensando…" : "Sugerir nombres"}
            </Button>
            {generating && <span className="text-xs text-muted">Tarda menos de un minuto.</span>}
            {!hasInput && <span className="text-xs text-muted">Escribe el brief (01) o qué debe transmitir el nombre.</span>}
          </div>

          <form onSubmit={addManual} className="mt-auto pt-6">
            <Label>Agregar a mano</Label>
            <div className="field rounded-2xl p-3 space-y-1.5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre"
                className="w-full bg-transparent text-base focus:outline-none placeholder:text-muted"
              />
              <input
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="Qué significa o de dónde sale (opcional)"
                className="w-full bg-transparent text-xs focus:outline-none placeholder:text-muted"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!newName.trim()}>
                  Agregar
                </Button>
              </div>
            </div>
          </form>
        </Panel>
      </div>

      {/* Tablero */}
      <Panel>
        <SectionTitle
          title="Exploración de nombres"
          hint="Pasa a Shortlist los que valen la pena y revisa a mano dominio, redes e IMPI antes de elegir uno."
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Explorados" value={names.length} />
          <Stat label="Shortlist" value={counts.byStatus.shortlist ?? 0} />
          <Stat label="Descartados" value={counts.byStatus.discarded ?? 0} />
          <Stat
            label="Elegido"
            value={names.find((n) => statusOf(n) === "chosen")?.title ?? "—"}
            small={!!names.find((n) => statusOf(n) === "chosen")}
          />
        </div>

        {names.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex flex-wrap gap-1">
              {(["all", "shortlist", "explore", "chosen", "discarded"] as Filter[]).map((f) => {
                const label = f === "all" ? "Todos" : NAME_STATUSES.find((s) => s.key === f)!.label;
                const n = f === "all" ? names.length : counts.byStatus[f] ?? 0;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      filter === f ? "bg-ink text-paper" : "text-muted hover:text-ink hover:bg-ink/5"
                    }`}
                  >
                    {label} <span className="opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {NAME_STYLES.filter((s) => counts.byStyle[s.key]).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStyleFilter(styleFilter === s.key ? null : s.key)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    styleFilter === s.key ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {s.label} {counts.byStyle[s.key]}
                </button>
              ))}
            </div>
          </div>
        )}

        {names.length === 0 ? (
          <p className="text-sm text-muted py-10 text-center">
            Todavía no hay nombres. Pide sugerencias a Claude o agrega los que ya traiga el equipo o el cliente.
          </p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted py-10 text-center">Ningún nombre con este filtro.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((n) => (
              <NameCard key={n.id} item={n} />
            ))}
          </div>
        )}
      </Panel>

      {finalists.length > 0 && <TypeTest names={finalists} />}
    </div>
  );
}

function NameCard({ item }: { item: BrandItem }) {
  const { updateItem, deleteItem } = useBrand();
  const d = nameData(item);
  const status = statusOf(item);
  const query = encodeURIComponent(`"${item.title ?? ""}"`);
  const handle = d.handle || (item.title ?? "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

  return (
    <article
      className={`rounded-2xl border p-5 flex flex-col gap-3 bg-paper/40 ${
        status === "chosen" ? "border-accent" : status === "shortlist" ? "border-ink/30" : "border-line"
      } ${status === "discarded" ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <InlineInput
          value={item.title}
          onSave={(title) => updateItem(item.id, { title })}
          placeholder="Nombre"
          className="text-3xl leading-tight tracking-[-0.02em]"
        />
        <button
          onClick={() => updateItem(item.id, { status: status === "shortlist" ? "explore" : "shortlist" })}
          title={status === "shortlist" ? "Quitar de la shortlist" : "Pasar a shortlist"}
          className={`shrink-0 text-lg leading-none mt-1.5 ${status === "shortlist" || status === "chosen" ? "text-accent" : "text-muted hover:text-ink"}`}
        >
          {status === "shortlist" || status === "chosen" ? "★" : "☆"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 -mt-1">
        <select
          value={d.style ?? ""}
          onChange={(e) => updateItem(item.id, { data: { style: (e.target.value || undefined) as NameStyle } })}
          className="text-[11px] rounded-full border border-line bg-transparent px-2 py-0.5 text-muted focus:outline-none"
        >
          <option value="">Estilo…</option>
          {NAME_STYLES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        {item.aiGenerated && (
          <span className="text-[10px] font-mono text-muted border border-line rounded-full px-2 py-0.5">IA</span>
        )}
        {d.pronunciation && <span className="text-xs text-muted">Se dice: {d.pronunciation}</span>}
      </div>

      <InlineTextarea
        value={d.meaning ?? null}
        onSave={(meaning) => updateItem(item.id, { data: { meaning } })}
        placeholder="Qué significa o de dónde sale…"
        className="text-sm leading-relaxed"
      />
      <InlineTextarea
        value={d.rationale ?? null}
        onSave={(rationale) => updateItem(item.id, { data: { rationale } })}
        placeholder="Por qué funciona para esta marca…"
        className="text-xs leading-relaxed text-muted"
      />

      {/* Revisión manual */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {(
          [
            ["domain", "Dominio"],
            ["social", "Redes"],
            ["trademark", "IMPI"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => updateItem(item.id, { data: { [key]: !d[key] } })}
            title={d[key] ? "Revisado y disponible" : "Marcar como revisado y disponible"}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              d[key] ? "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400" : "border-line text-muted hover:text-ink"
            }`}
          >
            {d[key] ? "✓ " : ""}
            {label}
          </button>
        ))}
        <span className="ml-auto flex gap-3 text-xs">
          <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
            Google ↗
          </a>
          {handle && (
            <a href={`https://www.instagram.com/${handle}/`} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
              @{handle} ↗
            </a>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-line">
        <Pills options={NAME_STATUSES} value={status} onChange={(s) => updateItem(item.id, { status: s })} />
        <DeleteButton onConfirm={() => deleteItem(item.id)} confirmText={`¿Eliminar "${item.title}"?`} />
      </div>
    </article>
  );
}

// El nombre en varias tipografías y fondos, para sentir cómo se ve
function TypeTest({ names }: { names: BrandItem[] }) {
  const [id, setId] = useState(names[0].id);
  const current = names.find((n) => n.id === id) ?? names[0];
  const name = current.title ?? "";
  const treatments: { label: string; className: string; style?: React.CSSProperties; dark?: boolean }[] = [
    { label: "Sans", className: "text-4xl sm:text-5xl tracking-[-0.03em] font-medium" },
    { label: "Serif", className: "text-4xl sm:text-5xl italic", style: { fontFamily: "Georgia, 'Times New Roman', serif" }, dark: true },
    { label: "Mayúsculas", className: "text-xl sm:text-3xl tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light" },
    { label: "Mono", className: "text-3xl sm:text-4xl lowercase", style: { fontFamily: "ui-monospace, Menlo, monospace" }, dark: true },
  ];

  return (
    <Panel>
      <SectionTitle title="Prueba del nombre" hint="Los nombres en shortlist, en distintas voces tipográficas y en contexto." />
      <div className="flex flex-wrap gap-1 mb-5">
        {names.map((n) => (
          <button
            key={n.id}
            onClick={() => setId(n.id)}
            className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
              n.id === current.id ? "bg-ink text-paper" : "text-muted hover:text-ink hover:bg-ink/5"
            }`}
          >
            {n.title}
            {n.status === "chosen" && " ●"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {treatments.map((t) => (
          <div
            key={t.label}
            className={`relative rounded-2xl aspect-[16/9] flex items-center justify-center overflow-hidden px-6 ${
              t.dark ? "bg-[#1d1d1f] text-white" : "bg-white text-[#1d1d1f] border border-line"
            }`}
          >
            <span className={`truncate max-w-full ${t.className}`} style={t.style}>
              {name}
            </span>
            <span className={`absolute left-4 bottom-3 text-[10px] tracking-[0.2em] uppercase ${t.dark ? "text-white/40" : "text-[#86868b]"}`}>
              {t.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <Context>Bienvenido a {name}</Context>
        <Context>¿Ya probaste {name}?</Context>
        <Context>
          @{(nameData(current).handle || name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, ""))}
        </Context>
      </div>
    </Panel>
  );
}

function Context({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-ink/[0.04] px-4 py-3 truncate">{children}</p>;
}

function Stat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-ink/[0.04] px-4 py-3 min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className={`${small ? "text-xl" : "text-3xl"} tracking-[-0.02em] mt-1 truncate`}>{value}</p>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs text-muted mb-2 ${className}`}>{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
