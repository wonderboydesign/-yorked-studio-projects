"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BRIEF_TYPE_LABELS, BriefAnswers, BriefQuestion, BriefQuestionType, answeredCount, briefToText, hasAnswer, newQuestionId } from "@/lib/brief";

type Notify = (message: string, tone?: "ok" | "error") => void;

interface BriefData {
  title: string;
  intro: string | null;
  questions: BriefQuestion[];
  answers: BriefAnswers;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
}

const field = "field w-full rounded-xl px-3 py-2 text-sm";

// Brief del cliente (formulario del portal): el estudio lo activa, edita todas
// las preguntas, ve las respuestas y las pasa al Brief de Branding
export default function BriefEditor({ projectId, notify }: { projectId: string; notify: Notify }) {
  const [brief, setBrief] = useState<BriefData | null | undefined>(undefined);
  const [showAnswers, setShowAnswers] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = `/api/projects/${projectId}/brief`;

  const load = useCallback(async () => {
    const res = await fetch(base);
    setBrief(res.ok ? await res.json() : null);
  }, [base]);
  useEffect(() => {
    load();
    // Al volver a la pestaña, trae las respuestas más recientes del cliente
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  async function patch(body: Record<string, unknown>, quiet = true) {
    const res = await fetch(base, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return notify((await res.json().catch(() => null))?.error ?? "No se pudo guardar el brief.", "error");
    if (!quiet) setBrief(await res.json());
  }

  // Cambios de preguntas: se ven al instante y se guardan solos
  function setQuestions(questions: BriefQuestion[]) {
    setBrief((b) => (b ? { ...b, questions } : b));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => patch({ questions }), 800);
  }
  const update = (i: number, change: Partial<BriefQuestion>) =>
    setQuestions((brief?.questions ?? []).map((q, j) => (j === i ? { ...q, ...change } : q)));
  const move = (i: number, d: number) => {
    const list = [...(brief?.questions ?? [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setQuestions(list);
  };

  async function activate() {
    setBusy(true);
    const res = await fetch(base, { method: "POST" });
    setBusy(false);
    if (!res.ok) return notify("No se pudo activar el brief.", "error");
    setBrief(await res.json());
    setEditing(true);
    notify("Brief activado con la plantilla. Revísala y ajusta lo que quieras.");
  }

  async function remove() {
    if (!window.confirm("¿Quitar el brief de este portal? Se borran las preguntas y las respuestas del cliente.")) return;
    const res = await fetch(base, { method: "DELETE" });
    if (!res.ok) return notify("No se pudo quitar.", "error");
    setBrief(null);
    notify("Brief quitado");
  }

  async function toBranding() {
    const res = await fetch(`${base}/branding`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) return notify(data?.error ?? "No se pudo pasar al Brief de Branding.", "error");
    patch({ reviewed: true });
    notify(data.appended ? "Agregado debajo del Brief de Branding" : "Pasado al Brief de Branding");
  }

  if (brief === undefined) return null;

  if (brief === null) {
    return (
      <section className="space-y-3">
        <h3 className="text-base">Brief del cliente</h3>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink/[0.04] p-4">
          <p className="min-w-0 flex-1 text-sm text-muted">
            Un formulario propio dentro de su portal, con tus preguntas. Sus respuestas se guardan aquí y se pueden pasar al Brief de Branding.
          </p>
          <button onClick={activate} disabled={busy} className="rounded-xl bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60">
            {busy ? "Activando…" : "Activar brief"}
          </button>
        </div>
      </section>
    );
  }

  const questions = brief.questions;
  const done = answeredCount(questions, brief.answers);
  const sections = Array.from(new Set(questions.map((q) => q.section).filter(Boolean)));
  const suggested = questions.filter((q) => q.suggested).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base">Brief del cliente</h3>
        <span className="text-xs text-muted">
          {brief.status === "submitted"
            ? `✓ Enviado${brief.submittedAt ? ` el ${new Date(brief.submittedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}` : ""}`
            : done > 0
            ? "En borrador"
            : "Sin respuestas todavía"}{" "}
          · {done} de {questions.length} respondidas
        </span>
      </div>

      <div className="space-y-3 rounded-2xl bg-ink/[0.04] p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => { setEditing((v) => !v); }} className="rounded-full bg-ink px-3 py-1.5 text-paper">
            {editing ? "Cerrar editor" : "Editar preguntas"}
          </button>
          <button onClick={async () => { if (!showAnswers) { await load(); patch({ reviewed: true }); } setShowAnswers((v) => !v); }} className="rounded-full bg-button px-3 py-1.5 hover:bg-button-hover">
            {showAnswers ? "Ocultar respuestas" : "Ver respuestas"}
          </button>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(briefToText(brief.title, questions, brief.answers));
              notify("Respuestas copiadas");
            }}
            disabled={done === 0}
            className="rounded-full bg-button px-3 py-1.5 hover:bg-button-hover disabled:opacity-50"
          >
            Copiar respuestas
          </button>
          <button onClick={toBranding} disabled={done === 0} className="rounded-full bg-button px-3 py-1.5 hover:bg-button-hover disabled:opacity-50">
            Pasar al Brief de Branding
          </button>
          {brief.status === "submitted" && (
            <button onClick={async () => { await patch({ reopen: true }, false); notify("Reabierto: el cliente puede seguir editando"); }} className="rounded-full bg-button px-3 py-1.5 hover:bg-button-hover">
              Reabrir
            </button>
          )}
          <button onClick={remove} className="ml-auto text-muted hover:text-red-600">
            Quitar brief
          </button>
        </div>

        {showAnswers && (
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl bg-paper/60 p-3 text-sm">
            {done === 0 && <p className="text-muted">Aún no hay respuestas.</p>}
            {questions
              .filter((q) => hasAnswer(brief.answers[q.id]))
              .map((q) => (
                <div key={q.id}>
                  <p className="text-xs text-muted">{q.label}</p>
                  <p className="whitespace-pre-wrap">{Array.isArray(brief.answers[q.id]) ? (brief.answers[q.id] as string[]).join(", ") : (brief.answers[q.id] as string)}</p>
                </div>
              ))}
          </div>
        )}

        {editing && (
          <div className="space-y-3 border-t border-ink/10 pt-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Título del formulario</span>
              <input key={`t-${brief.title}`} defaultValue={brief.title} onBlur={(e) => e.target.value.trim() && e.target.value !== brief.title && patch({ title: e.target.value }, false)} className={field} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Texto de introducción (lo ve el cliente arriba)</span>
              <textarea key={`i-${brief.intro ?? ""}`} defaultValue={brief.intro ?? ""} rows={2} onBlur={(e) => e.target.value !== (brief.intro ?? "") && patch({ intro: e.target.value }, false)} className={field} />
            </label>

            <datalist id={`brief-sections-${projectId}`}>
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <ol className="space-y-2">
              {questions.map((q, i) => (
                <li key={q.id} className="space-y-2 rounded-xl bg-paper/60 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{i + 1}.</span>
                    <input value={q.section} onChange={(e) => update(i, { section: e.target.value })} list={`brief-sections-${projectId}`} placeholder="Sección" className="field rounded-lg px-2 py-1 text-xs" />
                    {q.suggested && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-700 dark:text-amber-400" title="No estaba en tu formulario original">
                        Sugerida
                      </span>
                    )}
                    <span className="ml-auto flex gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 hover:text-ink disabled:opacity-30" aria-label="Subir">↑</button>
                      <button onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="rounded px-1.5 hover:text-ink disabled:opacity-30" aria-label="Bajar">↓</button>
                      <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="rounded px-1.5 hover:text-red-600" aria-label="Quitar pregunta">Quitar</button>
                    </span>
                  </div>
                  <textarea value={q.label} onChange={(e) => update(i, { label: e.target.value })} rows={1} className={field} placeholder="Pregunta" />
                  <input value={q.help ?? ""} onChange={(e) => update(i, { help: e.target.value })} className={`${field} text-xs`} placeholder="Ayuda debajo de la pregunta (opcional)" />
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <select value={q.type} onChange={(e) => update(i, { type: e.target.value as BriefQuestionType, options: e.target.value === "choice" || e.target.value === "multi" ? q.options ?? ["Opción 1", "Opción 2"] : undefined })} className="field rounded-lg px-2 py-1 text-xs">
                      {(Object.keys(BRIEF_TYPE_LABELS) as BriefQuestionType[]).map((t) => (
                        <option key={t} value={t}>{BRIEF_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={!!q.required} onChange={(e) => update(i, { required: e.target.checked })} /> Obligatoria
                    </label>
                    {q.suggested && (
                      <button onClick={() => update(i, { suggested: undefined })} className="text-muted hover:text-ink">Quedarme con ella</button>
                    )}
                  </div>
                  {(q.type === "choice" || q.type === "multi") && (
                    <textarea
                      value={(q.options ?? []).join("\n")}
                      onChange={(e) => update(i, { options: e.target.value.split("\n") })}
                      rows={Math.min(8, Math.max(3, (q.options ?? []).length))}
                      className={`${field} text-xs`}
                      placeholder="Una opción por línea"
                    />
                  )}
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setQuestions([...questions, { id: newQuestionId(), section: questions[questions.length - 1]?.section ?? "", label: "", type: "long" }])}
                className="rounded-full bg-ink px-3 py-1.5 text-paper"
              >
                + Pregunta
              </button>
              {suggested > 0 && (
                <>
                  <button onClick={() => setQuestions(questions.map((q) => ({ ...q, suggested: undefined })))} className="rounded-full bg-button px-3 py-1.5 hover:bg-button-hover">
                    Quedarme con las {suggested} sugeridas
                  </button>
                  <button onClick={() => setQuestions(questions.filter((q) => !q.suggested))} className="rounded-full bg-button px-3 py-1.5 hover:bg-button-hover">
                    Quitar las {suggested} sugeridas
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted">
              Los cambios se guardan solos. Si quitas una pregunta con respuestas, esa respuesta ya no se muestra. Las preguntas sugeridas son nuevas respecto a tu Google Forms; quédate con las que te sirvan.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
