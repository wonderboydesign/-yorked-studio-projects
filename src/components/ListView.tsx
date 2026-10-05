"use client";

import { useRef, useState } from "react";
import { Task, Project, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { parseDate, formatLong, capMonth } from "@/lib/date";
import { dueTone, DUE_TEXT_CLASS, DUE_DOT_CLASS } from "@/lib/dueTone";

export default function ListView({
  tasks,
  projects,
  onSelectTask,
  onRenameTask,
}: {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (t: Task) => void;
  onRenameTask: (id: string, name: string) => void;
}) {
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Escape cancela; el blur que sigue no debe guardar
  const cancelRef = useRef(false);

  function startEdit(t: Task) {
    cancelRef.current = false;
    setDraft(t.name);
    setEditingId(t.id);
  }

  function finishEdit(t: Task) {
    if (editingId !== t.id) return;
    const next = draft.trim();
    setEditingId(null);
    if (cancelRef.current || !next || next === t.name) return;
    onRenameTask(t.id, next);
  }
  const sorted = [...tasks].sort(
    (a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-[11px] text-muted py-16 text-center">
        Aún no hay tareas. Crea un proyecto y agrega tu primera tarea.
      </div>
    );
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-muted border-b-2 border-ink">
          <th className="pl-0 pr-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[11px]">Tarea</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[11px]">Proyecto</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[11px]">Inicio</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[11px]">Fin</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[11px]">Asignado</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[11px]">Estado</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((t) => {
          const project = projectMap[t.projectId];
          return (
            <tr
              key={t.id}
              onClick={() => onSelectTask(t)}
              className="cursor-pointer hover:bg-ink/[0.03] border-b border-line"
            >
              <td className="pl-0 pr-4 py-3.5 text-ink text-sm" onClick={(e) => editingId === t.id && e.stopPropagation()}>
                {editingId === t.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => finishEdit(t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") {
                        cancelRef.current = true;
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full bg-surface rounded-lg px-2 py-1 -mx-2 text-sm text-ink outline-none ring-2 ring-accent/30"
                  />
                ) : (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(t);
                    }}
                    className="cursor-text rounded-lg px-2 py-1 -mx-2 hover:bg-ink/5"
                    title="Clic para editar el nombre"
                  >
                    {t.name}
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <span
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide"
                  style={{ color: project?.color }}
                >
                  {project?.name || "—"}
                </span>
              </td>
              <td className="px-4 py-3.5 text-[11px] text-muted">{capMonth(formatLong(parseDate(t.startDate)))}</td>
              <td className="px-4 py-3.5 text-[11px]">
                {(() => {
                  const tone = dueTone(t.endDate, t.status);
                  const dot = DUE_DOT_CLASS[tone];
                  return (
                    <span className={`inline-flex items-center gap-1.5 ${DUE_TEXT_CLASS[tone]} ${tone === "overdue" || tone === "today" ? "font-medium" : ""}`}>
                      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />}
                      {capMonth(formatLong(parseDate(t.endDate)))}
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-3.5 text-[11px] text-muted">{t.assignee?.name || "—"}</td>
              <td className="px-4 py-3.5">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink border border-line px-2 py-1">
                  <span
                    className="w-1.5 h-1.5 inline-block shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[t.status] }}
                  />
                  {STATUS_LABELS[t.status]}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
