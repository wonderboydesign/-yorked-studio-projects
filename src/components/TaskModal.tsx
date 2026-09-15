"use client";

import { useEffect, useState } from "react";
import { Project, Task, User, Status, STATUS_LABELS, STATUS_ORDER, STATUS_COLORS } from "@/lib/types";
import { toISODate, localToday } from "@/lib/date";

export default function TaskModal({
  task,
  projects,
  users,
  defaultProjectId,
  defaultStartDate,
  onClose,
  onSave,
  onDelete,
}: {
  task?: Task | null;
  projects: Project[];
  users: User[];
  defaultProjectId?: string;
  defaultStartDate?: string;
  onClose: () => void;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const today = toISODate(localToday());
  const initialName = task?.name || "";
  const initialProjectId = task?.projectId || defaultProjectId || projects[0]?.id || "";
  const initialStatus: Status = task?.status || "TODO";
  const initialStartDate = task ? task.startDate.slice(0, 10) : defaultStartDate || today;
  const initialEndDate = task ? task.endDate.slice(0, 10) : defaultStartDate || today;
  const initialNotes = task?.notes || "";
  const initialAssigneeId = task?.assigneeId || "";

  const [name, setName] = useState(initialName);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [notes, setNotes] = useState(initialNotes);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const dirty =
    name !== initialName ||
    projectId !== initialProjectId ||
    status !== initialStatus ||
    startDate !== initialStartDate ||
    endDate !== initialEndDate ||
    notes !== initialNotes ||
    assigneeId !== initialAssigneeId;

  function attemptClose() {
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") attemptClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dirty, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !projectId || !startDate || !endDate) return;
    setSaving(true);
    await onSave({
      name,
      projectId,
      status,
      startDate,
      endDate,
      notes: notes || null,
      assigneeId: assigneeId || null,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4" onClick={attemptClose}>
      <div className="bg-surface rounded-lg w-full max-w-md p-6 border border-line" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink mb-4">
          <span className="relative top-[1px] left-[-1px] inline-block">●</span>
          {task ? "Editar tarea" : "Nueva tarea"}
        </h2>
        {projects.length === 0 ? (
          <p className="text-xs text-muted">
            Primero crea un proyecto para poder agregar tareas.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full border border-line rounded-md px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Proyecto</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-line rounded-md px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Asignado a</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full border border-line rounded-md px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-line rounded-md px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Fecha fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-line rounded-md px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                style={{ backgroundColor: STATUS_COLORS[status], color: "#262626" }}
                className="w-full border border-line rounded-md px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
            <label className="block text-xs font-medium mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="URL, instrucciones o cualquier nota útil"
              className="w-full border border-line rounded-md px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
              />
            </div>

            {confirmingDelete ? (
              <div className="pt-2 space-y-3">
                <p className="text-xs">
                  ¿Estás seguro que deseas eliminar la tarea “{task?.name}”?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="text-xs px-3 py-2 rounded-md border border-line"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => task && onDelete && onDelete(task.id)}
                    className="text-xs px-3 py-2 rounded-md bg-red-600 text-paper"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            ) : confirmingDiscard ? (
              <div className="pt-2 space-y-3">
                <p className="text-xs">
                  Tienes cambios sin guardar. Si sales ahora, se perderán.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDiscard(false)}
                    className="text-xs px-3 py-2 rounded-md border border-line"
                  >
                    Seguir editando
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs px-3 py-2 rounded-md bg-red-600 text-paper"
                  >
                    Salir sin guardar
                  </button>
                </div>
              </div>
            ) : (
            <div className="flex items-center justify-between pt-2">
              <div>
                {task && onDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-xs text-red-600"
                  >
                    Eliminar tarea
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={attemptClose}
                  className="text-xs px-3 py-2 rounded-md border border-line"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !name}
                  className="text-xs px-3 py-2 rounded-md bg-ink text-paper disabled:opacity-40"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
