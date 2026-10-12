"use client";

import { useState } from "react";
import {
  BrandItem,
  BrandResearch,
  CompetitorData,
  DEFAULT_AXES,
  IDEA_STATUSES,
  InsightData,
  RESEARCH_BLOCKS,
  ResearchBlockKey,
  isImage,
} from "@/lib/branding";
import { IMAGE_EXTENSIONS, uploadFile } from "@/lib/upload";
import { useBrand } from "./BrandContext";
import PositionMap, { competitorPoints } from "./PositionMap";
import { AddTextForm, AutoText, Button, DeleteButton, InlineInput, InlineTextarea, Panel, SectionTitle } from "./ui";

const PLAN_TEMPLATE = `OBJETIVO
Qué tiene que lograr la marca al terminar el proyecto.

CONCEPTO(S) A DESARROLLAR
-

ENTREGABLES
[ ] Estrategia / plataforma de marca (propósito, valores, personalidad)
[ ] Naming / tagline
[ ] Logotipo y variantes
[ ] Paleta de color
[ ] Tipografía
[ ] Sistema gráfico (patrones, iconografía, ilustración, fotografía)
[ ] Aplicaciones (papelería, redes, empaque, señalética, web…)
[ ] Manual de marca

PENDIENTES DE INVESTIGAR
-

FECHAS CLAVE
- Presentación de conceptos:
- Presentación final:
`;

export default function ResearchStage() {
  const { data, patchWorkspace, patchResearch: patchResearchFn, addItem, updateItem, deleteItem } = useBrand();
  const ideas = data.items.filter((i) => i.section === "research" && i.kind === "idea");
  const chosen = data.items.filter((i) => i.kind === "concept" && i.status === "chosen");
  const competitors = data.items.filter((i) => i.kind === "competitor");
  const insights = data.items.filter((i) => i.kind === "insight");
  const research: BrandResearch = data.workspace.research ?? {};
  const blocks = research.blocks ?? {};

  function patchResearch(fields: Partial<BrandResearch>) {
    patchResearchFn((current) => ({ ...current, ...fields }));
  }

  // Qué tan completo va el research, para el resumen de arriba
  const checklist = [
    ...RESEARCH_BLOCKS.map((b) => ({ label: b.label, done: !!blocks[b.key]?.trim() })),
    { label: `Competencia · ${competitors.length}`, done: competitors.length >= 2 },
    { label: "Mapa", done: !!research.target },
    { label: `Hallazgos · ${insights.length}`, done: insights.length >= 1 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-5">
      {chosen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">Conceptos elegidos</span>
          {chosen.map((c) => (
            <span key={c.id} className="text-xs border border-accent text-ink rounded-full px-3 py-1" title={c.body ?? ""}>
              {c.title}
            </span>
          ))}
        </div>
      )}

      <div className="glass rounded-3xl p-5 sm:p-6 flex flex-wrap items-center gap-2">
        <span className="text-sm mr-2">
          Research <span className="text-muted">{doneCount}/{checklist.length}</span>
        </span>
        {checklist.map((c) => (
          <span
            key={c.label}
            className={`text-xs px-2.5 py-1 rounded-lg ${c.done ? "bg-ink text-paper" : "bg-ink/[0.05] text-muted"}`}
          >
            {c.done ? "✓ " : ""}
            {c.label}
          </span>
        ))}
      </div>

      <Panel>
        <SectionTitle
          title="Bloques de investigación"
          hint="Las mismas secciones en cada proyecto, para que todo el equipo investigue igual. Claude las usa al generar conceptos."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {RESEARCH_BLOCKS.map((b) => (
            <div key={b.key}>
              <h4 className="text-base mb-1 flex items-center gap-2">
                {b.label}
                {blocks[b.key]?.trim() && <span className="text-xs text-muted">✓</span>}
              </h4>
              <p className="text-xs text-muted mb-2">{b.hint}</p>
              <AutoText
                value={blocks[b.key] ?? ""}
                onSave={(text) =>
                  patchResearchFn((current) => ({
                    ...current,
                    blocks: { ...(current.blocks ?? {}), [b.key as ResearchBlockKey]: text },
                  }))
                }
                rows={7}
                placeholder={b.placeholder}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Competitors competitors={competitors} />

      <Panel>
        <SectionTitle
          title="Mapa de posicionamiento"
          hint="Arrastra a cada competidor y luego coloca “Nosotros” donde queremos llevar la marca. El espacio vacío es la oportunidad."
          action={
            !research.target && (
              <Button onClick={() => patchResearch({ target: { x: 0.75, y: 0.75 } })}>Colocar “Nosotros”</Button>
            )
          }
        />
        <AxesEditor
          axes={research.axes ?? DEFAULT_AXES}
          onChange={(axes) => patchResearch({ axes })}
        />
        {competitors.length === 0 && !research.target ? (
          <p className="text-sm text-muted text-center py-16">Agrega competidores arriba para ubicarlos aquí.</p>
        ) : (
          <PositionMap
            className="w-full max-w-4xl mx-auto aspect-[16/10] mt-5 bg-ink/[0.025] rounded-3xl"
            labelClass="text-xs"
            axisClass="text-xs p-3"
            axes={research.axes ?? DEFAULT_AXES}
            target={research.target}
            points={competitorPoints(competitors)}
            onMove={(id, x, y) => {
              updateItem(id, { data: { x, y } });
            }}
            onMoveTarget={(x, y) => patchResearch({ target: { x, y } })}
          />
        )}
      </Panel>

      <Insights insights={insights} />

      <Panel>
        <SectionTitle
          title="Ideas"
          hint="Define una idea por tarjeta y muévela según avance: lo que hay que explorar, lo que ya se desarrolla y lo que se descarta."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {IDEA_STATUSES.map((col) => {
            const list = ideas.filter((i) => (i.status ?? "explore") === col.key);
            return (
              <div key={col.key} className="bg-ink/[0.03] rounded-3xl p-3 min-w-0">
                <h4 className="font-mono text-xs text-muted mb-3">
                  {col.label} · {list.length}
                </h4>
                <div className="space-y-2">
                  {list.map((idea) => (
                    <article key={idea.id} className="glass rounded-2xl p-4 space-y-2">
                      <InlineInput
                        value={idea.title}
                        onSave={(title) => updateItem(idea.id, { title })}
                        placeholder="Idea"
                        className="text-sm font-medium"
                      />
                      <InlineTextarea
                        value={idea.body}
                        onSave={(body) => updateItem(idea.id, { body })}
                        placeholder="Desarrolla la idea: hallazgos, ligas, por qué sí o por qué no…"
                        className="text-xs leading-relaxed text-ink/80"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-1">
                          {IDEA_STATUSES.filter((s) => s.key !== col.key).map((s) => (
                            <button
                              key={s.key}
                              onClick={() => updateItem(idea.id, { status: s.key })}
                              className="text-xs text-muted hover:text-ink border border-line rounded-full px-2 py-0.5"
                            >
                              → {s.label}
                            </button>
                          ))}
                        </div>
                        <DeleteButton onConfirm={() => deleteItem(idea.id)} confirmText="¿Eliminar esta idea?" />
                      </div>
                    </article>
                  ))}
                  {col.key === "explore" && (
                    <AddTextForm
                      withTitle
                      titlePlaceholder="Nueva idea"
                      placeholder="Detalle (opcional)"
                      onAdd={(title, body) => addItem({ section: "research", kind: "idea", title, body, status: "explore" })}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          title="Plano general"
          hint="Todo lo que hay que desarrollar, en una sola vista. Es la lista que se revisa al cerrar el proyecto."
          action={
            !data.workspace.plan?.trim() && (
              <Button onClick={() => patchWorkspace({ plan: PLAN_TEMPLATE })}>Usar plantilla</Button>
            )
          }
        />
        <AutoText
          key={data.workspace.plan ? "plan" : "empty"}
          value={data.workspace.plan}
          onSave={(plan) => patchWorkspace({ plan })}
          rows={18}
          className="font-mono text-xs"
          placeholder="Objetivo, entregables, pendientes, fechas…"
        />
      </Panel>
    </div>
  );
}

function Competitors({ competitors }: { competitors: BrandItem[] }) {
  const { addItem, updateItem, deleteItem, notify } = useBrand();
  const [name, setName] = useState("");
  const [site, setSite] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const url = site.trim();
    await addItem({
      section: "research",
      kind: "competitor",
      title: name.trim(),
      linkUrl: url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : null,
      data: {},
    });
    setName("");
    setSite("");
  }

  async function uploadLogo(item: BrandItem, file: File) {
    try {
      const up = await uploadFile(file, IMAGE_EXTENSIONS);
      updateItem(item.id, { url: up.url, pathname: up.pathname, contentType: up.contentType });
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo subir el logotipo.", "error");
    }
  }

  function setField(item: BrandItem, key: keyof CompetitorData, value: string) {
    updateItem(item.id, { data: { [key]: value } });
  }

  return (
    <Panel>
      <SectionTitle
        title="Competencia"
        hint="Una ficha por competidor directo o referente de la categoría. Con dos o más ya puedes armar el mapa."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {competitors.map((c) => {
          const d = (c.data ?? {}) as CompetitorData;
          return (
            <article key={c.id} className="rounded-3xl bg-ink/[0.03] p-5 flex flex-col gap-3 min-w-0">
              <div className="flex items-center gap-3">
                <label
                  className="shrink-0 w-14 h-14 rounded-2xl bg-ink/[0.06] flex items-center justify-center overflow-hidden cursor-pointer hover:bg-ink/[0.1]"
                  title="Subir logotipo"
                >
                  {c.url && isImage(c.contentType, c.url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.url} alt="" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <span className="text-xs text-muted">Logo</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLogo(c, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <InlineInput
                    value={c.title}
                    onSave={(title) => title.trim() && updateItem(c.id, { title: title.trim() })}
                    className="text-base"
                  />
                  {c.linkUrl && (
                    <a
                      href={c.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted hover:text-ink truncate block"
                    >
                      {c.linkUrl.replace(/^https?:\/\//, "")} ↗
                    </a>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-sm">
                {(
                  [
                    ["colors", "Colores"],
                    ["typography", "Tipografía"],
                    ["tone", "Tono"],
                    ["price", "Precio"],
                  ] as [keyof CompetitorData, string][]
                ).map(([key, label]) => (
                  <div key={key} className="contents">
                    <dt className="text-xs text-muted pt-0.5">{label}</dt>
                    <dd className="min-w-0">
                      <InlineInput
                        value={(d[key] as string) ?? ""}
                        onSave={(v) => setField(c, key, v)}
                        placeholder="—"
                        className="text-sm"
                      />
                    </dd>
                  </div>
                ))}
              </dl>
              <InlineTextarea
                value={c.body}
                onSave={(body) => updateItem(c.id, { body })}
                placeholder="Posicionamiento, qué hacen bien, qué no…"
                className="text-sm text-ink/80"
              />
              <div className="mt-auto flex justify-end">
                <DeleteButton onConfirm={() => deleteItem(c.id)} confirmText={`¿Eliminar a "${c.title}"?`} />
              </div>
            </article>
          );
        })}

        <form onSubmit={add} className="field rounded-3xl p-5 flex flex-col gap-2 justify-center min-h-[160px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del competidor"
            className="bg-transparent text-base focus:outline-none placeholder:text-muted"
          />
          <input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="Sitio web o red social (opcional)"
            className="bg-transparent text-sm focus:outline-none placeholder:text-muted"
          />
          <div className="flex justify-end pt-1">
            <Button type="submit" tone="primary" disabled={!name.trim()}>
              Agregar competidor
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}

function AxesEditor({
  axes,
  onChange,
}: {
  axes: typeof DEFAULT_AXES;
  onChange: (axes: typeof DEFAULT_AXES) => void;
}) {
  const field = (key: keyof typeof DEFAULT_AXES, label: string) => (
    <label className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <InlineInput
        value={axes[key]}
        onSave={(v) => v.trim() && onChange({ ...axes, [key]: v.trim() })}
        className="text-sm"
      />
    </label>
  );
  return (
    <div className="grid gap-x-6 gap-y-2 grid-cols-2 lg:grid-cols-4">
      {field("xLeft", "← Izquierda")}
      {field("xRight", "Derecha →")}
      {field("yBottom", "↓ Abajo")}
      {field("yTop", "↑ Arriba")}
    </div>
  );
}

function Insights({ insights }: { insights: BrandItem[] }) {
  const { addItem, updateItem, deleteItem } = useBrand();
  const parts: [keyof InsightData, string, string][] = [
    ["found", "Encontramos", "Un dato, una observación, algo que dijo el cliente o un usuario…"],
    ["means", "Significa", "Por qué importa para la marca…"],
    ["opportunity", "Oportunidad", "Qué puede hacer la marca con esto…"],
  ];

  return (
    <Panel>
      <SectionTitle
        title="Hallazgos"
        hint="El puente hacia los conceptos: Claude los usa al generarlos y se vuelven la lámina “Lo que encontramos” de la presentación."
        action={
          <Button
            onClick={() => addItem({ section: "research", kind: "insight", data: { found: "", means: "", opportunity: "" } })}
          >
            + Hallazgo
          </Button>
        }
      />
      {insights.length === 0 ? (
        <p className="text-sm text-muted">
          Aún no hay hallazgos. Cuando el research esté avanzado, resume aquí lo más importante en 3 a 5 tarjetas.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {insights.map((ins, n) => {
            const d = (ins.data ?? {}) as InsightData;
            return (
              <article key={ins.id} className="rounded-3xl bg-ink/[0.03] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Hallazgo {String(n + 1).padStart(2, "0")}</span>
                  <DeleteButton onConfirm={() => deleteItem(ins.id)} confirmText="¿Eliminar este hallazgo?" />
                </div>
                {parts.map(([key, label, placeholder]) => (
                  <div key={key} className="grid grid-cols-[100px_1fr] gap-3">
                    <span className={`text-sm ${key === "opportunity" ? "text-ink" : "text-muted"}`}>{label}</span>
                    <InlineTextarea
                      value={d[key] ?? ""}
                      onSave={(v) => updateItem(ins.id, { data: { [key]: v } })}
                      placeholder={placeholder}
                      className={`text-sm ${key === "opportunity" ? "font-medium" : ""}`}
                    />
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
