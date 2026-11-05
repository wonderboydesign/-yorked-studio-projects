"use client";

import { useState } from "react";
import { BriefFieldStatus } from "@/lib/branding";
import { useBrand } from "./BrandContext";
import { Button, Panel, SectionTitle } from "./ui";

const STATUS: Record<BriefFieldStatus, { label: string; dot: string }> = {
  ok: { label: "Claro", dot: "bg-green-600" },
  partial: { label: "A medias", dot: "bg-amber-500" },
  missing: { label: "Falta", dot: "bg-ink/25" },
};

// Lectura del brief con Claude: qué ya está claro, qué falta preguntarle al
// cliente y un concepto inicial que se puede pasar a la etapa 02
export default function BriefAnalysisPanel() {
  const { data, project, analyzeBrief, addItem, generateConcepts, notify } = useBrand();
  const [busy, setBusy] = useState<"analyze" | "concepts" | null>(null);
  const a = data.workspace.briefAnalysis;

  const hasInput =
    !!data.workspace.brief?.trim() ||
    !!data.workspace.context?.trim() ||
    data.items.some((i) => i.section === "brief" && (i.kind === "comment" || i.kind === "file"));

  async function analyze() {
    setBusy("analyze");
    const res = await analyzeBrief();
    setBusy(null);
    if (res) notify("Brief analizado");
  }

  async function copyQuestions() {
    if (!a) return;
    const text = `Hola, para arrancar con ${project.name} nos ayudaría saber:\n\n${a.questions
      .map((q, i) => `${i + 1}. ${q.question}`)
      .join("\n")}\n\n¡Gracias!`;
    await navigator.clipboard.writeText(text);
    notify("Preguntas copiadas, listas para WhatsApp o correo");
  }

  async function questionsAsComment() {
    if (!a) return;
    await addItem({
      section: "brief",
      kind: "comment",
      body: `Preguntas pendientes para el cliente:\n${a.questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`,
    });
    notify("Preguntas guardadas como comentario");
  }

  async function seedToConcepts() {
    if (!a) return;
    await addItem({
      section: "concept",
      kind: "concept",
      title: a.conceptSeed.name,
      body: `${a.conceptSeed.idea}\n\nPor qué: ${a.conceptSeed.why}`,
      status: "proposed",
    });
    notify("Concepto agregado en 02 Concepto");
  }

  async function threeConcepts() {
    setBusy("concepts");
    const ok = await generateConcepts(3, "");
    setBusy(null);
    if (ok) notify("Conceptos nuevos en 02 Concepto");
  }

  if (!a) {
    return (
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="text-lg">Lectura del brief con Claude</h3>
            <p className="text-sm text-muted mt-1">
              Claude lee el brief, el contexto, los comentarios y los archivos (PDF e imágenes), te dice qué ya está claro, qué
              falta preguntarle al cliente y propone un concepto inicial.
            </p>
          </div>
          <Button tone="primary" onClick={analyze} disabled={!hasInput || busy !== null}>
            {busy === "analyze" ? "Leyendo…" : "Analizar brief"}
          </Button>
        </div>
        {!hasInput && <p className="text-xs text-muted mt-3">Escribe el brief, una nota o sube un archivo para empezar.</p>}
        {busy === "analyze" && <p className="text-xs text-muted mt-3">Tarda alrededor de un minuto.</p>}
      </Panel>
    );
  }

  const ok = a.fields.filter((f) => f.status === "ok").length;
  const partial = a.fields.filter((f) => f.status === "partial").length;

  return (
    <Panel>
      <SectionTitle
        title="Lectura del brief"
        hint={`Analizado el ${new Date(a.analyzedAt).toLocaleString("es-MX", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })} · Si agregas información, vuelve a analizar`}
        action={
          <Button onClick={analyze} disabled={busy !== null}>
            {busy === "analyze" ? "Leyendo…" : "Volver a analizar"}
          </Button>
        }
      />

      <p className="text-base leading-relaxed max-w-3xl">{a.summary}</p>

      {/* Avance del brief */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm mb-2">
          <span>
            {ok} de {a.fields.length} claros
            {partial > 0 && <span className="text-muted"> · {partial} a medias</span>}
          </span>
          <span className="text-xs text-muted">Lo que falta se resuelve con las preguntas de abajo</span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-ink/10">
          <span className="bg-green-600" style={{ width: `${(ok / a.fields.length) * 100}%` }} />
          <span className="bg-amber-500" style={{ width: `${(partial / a.fields.length) * 100}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-3 md:grid-cols-2">
        {a.fields.map((f) => (
          <div key={f.key} className="flex gap-3 border-t border-ink/[0.07] pt-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS[f.status].dot}`} title={STATUS[f.status].label} />
            <div className="min-w-0">
              <p className="text-sm">
                {f.label} <span className="text-xs text-muted">· {STATUS[f.status].label}</span>
              </p>
              {f.value && <p className="text-xs text-muted mt-0.5">{f.value}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Preguntas */}
        <div className="rounded-3xl bg-ink/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-base">Preguntas para el cliente</h4>
            <div className="flex gap-2">
              <Button onClick={copyQuestions}>Copiar para WhatsApp</Button>
              <Button tone="ghost" onClick={questionsAsComment}>
                Guardar como comentario
              </Button>
            </div>
          </div>
          <ol className="space-y-3">
            {a.questions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-xs text-muted w-5 shrink-0 pt-0.5">{i + 1}.</span>
                <div>
                  <p className="text-sm">{q.question}</p>
                  <p className="text-xs text-muted mt-0.5">{q.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Concepto inicial */}
        <div className="rounded-3xl bg-ink/[0.03] p-5 flex flex-col">
          <span className="text-xs text-muted">Concepto inicial</span>
          <h4 className="text-xl mt-1">{a.conceptSeed.name}</h4>
          <p className="text-sm mt-2">{a.conceptSeed.idea}</p>
          <p className="text-xs text-muted mt-2">{a.conceptSeed.why}</p>
          <div className="flex flex-wrap gap-1.5 mt-4">
            {a.keywords.map((k) => (
              <span key={k} className="text-xs rounded-lg bg-ink/[0.06] px-2 py-0.5">
                {k}
              </span>
            ))}
          </div>
          <div className="mt-auto pt-5 flex flex-wrap gap-2">
            <Button tone="primary" onClick={seedToConcepts}>
              Llevar a Conceptos
            </Button>
            <Button onClick={threeConcepts} disabled={busy !== null}>
              {busy === "concepts" ? "Pensando…" : "Generar 3 conceptos"}
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
