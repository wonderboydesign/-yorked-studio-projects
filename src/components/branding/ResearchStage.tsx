"use client";

import { IDEA_STATUSES } from "@/lib/branding";
import { useBrand } from "./BrandContext";
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
  const { data, patchWorkspace, addItem, updateItem, deleteItem } = useBrand();
  const ideas = data.items.filter((i) => i.section === "research" && i.kind === "idea");
  const chosen = data.items.filter((i) => i.kind === "concept" && i.status === "chosen");

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
