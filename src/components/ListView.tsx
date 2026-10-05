"use client";

import { useRef, useState } from "react";
import { Task, Project, User, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER } from "@/lib/types";
import { parseDate, formatLong, capMonth } from "@/lib/date";
import { dueTone, DUE_TEXT_CLASS, DUE_DOT_CLASS } from "@/lib/dueTone";
import Avatar from "./Avatar";

export default function ListView({
  tasks,
  projects,
  users,
  emptyMessage,
  onSelectTask,
  onRenameTask,
  onToggleDone,
  onAssign,
  onDelete,
}: {
  tasks: Task[];
  projects: Project[];
  users: User[];
  emptyMessage: string;
  onSelectTask: (t: Task) => void;
  onRenameTask: (id: string, name: string) => void;
  onToggleDone: (t: Task) => void;
  onAssign: (taskId: string, userId: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Escape cancela; el blur que sigue no debe guardar
  const cancelRef = useRef(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  if (tasks.length === 0) {
    return <div className="text-sm text-muted py-16 text-center">{emptyMessage}</div>;
  }

  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: tasks
      .filter((t) => t.status === status)
      .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()),
  })).filter((g) => g.items.length > 0);

  const headCell = "px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[11px]";

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-muted border-b-2 border-ink">
          <th className={`pl-0 pr-4 ${headCell.replace("px-4 ", "")}`}>Tarea</th>
          <th className={headCell}>Proyecto</th>
          <th className={headCell}>Inicio</th>
          <th className={headCell}>Fin</th>
          <th className={headCell}>Asignado</th>
          <th className={headCell}>Estado</th>
          <th className="w-28" aria-label="Acciones" />
        </tr>
      </thead>
      {groups.map(({ status, items }) => (
        <tbody key={status}>
          <tr>
            <td colSpan={7} className="pt-6 pb-2">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} aria-hidden="true" />
                {STATUS_LABELS[status]}
                <span className="text-muted">{items.length}</span>
              </span>
            </td>
          </tr>
          {items.map((t) => {
            const project = projectMap[t.projectId];
            const tone = dueTone(t.endDate, t.status);
            const dot = DUE_DOT_CLASS[tone];
            return (
              <tr
                key={t.id}
                onClick={() => onSelectTask(t)}
                className="group cursor-pointer hover:bg-ink/[0.03] border-b border-line"
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
                  <span className={`inline-flex items-center gap-1.5 ${DUE_TEXT_CLASS[tone]} ${tone === "overdue" || tone === "today" ? "font-medium" : ""}`}>
                    {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />}
                    {capMonth(formatLong(parseDate(t.endDate)))}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[11px] text-muted">
                  {t.assignee ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={t.assignee.name} size={20} />
                      {t.assignee.name}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink border border-line px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 inline-block shrink-0" style={{ backgroundColor: STATUS_COLORS[t.status] }} />
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-2 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  {deletingId === t.id ? (
                    <span className="inline-flex items-center gap-2 text-[11px]">
                      <span className="text-muted">¿Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingId(null);
                          onDelete(t.id);
                        }}
                        className="text-red-600 rounded-full"
                      >
                        Sí
                      </button>
                      <button type="button" onClick={() => setDeletingId(null)} className="text-muted hover:text-ink rounded-full">
                        No
                      </button>
                    </span>
                  ) : (
                    <span className="relative inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        title={t.status === "DONE" ? "Reabrir" : "Completar"}
                        aria-label={t.status === "DONE" ? "Reabrir" : "Completar"}
                        onClick={() => onToggleDone(t)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-ink/10 hover:text-ink"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2 6.5 4.5 9 10 3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssigningId(assigningId === t.id ? null : t.id)}
                        className="rounded-full px-2.5 py-1 text-[11px] text-muted hover:bg-ink/10 hover:text-ink"
                      >
                        Asignar
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => setDeletingId(t.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-red-600/10 hover:text-red-600"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                          <path d="M2.5 3.5h7M5 3.5V2.5h2v1M3.5 3.5l.5 6.5h4l.5-6.5" />
                        </svg>
                      </button>

                      {assigningId === t.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-2xl border border-line bg-surface p-1.5 text-left shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningId(null);
                              onAssign(t.id, null);
                            }}
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-ink/5 ${!t.assigneeId ? "font-semibold" : ""}`}
                          >
                            Sin asignar
                          </button>
                          {users.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setAssigningId(null);
                                onAssign(t.id, u.id);
                              }}
                              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-ink/5 ${t.assigneeId === u.id ? "font-semibold" : ""}`}
                            >
                              <Avatar name={u.name} size={22} />
                              {u.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
