"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types";
import { toISODate, localToday } from "@/lib/date";

const COLOR_OPTIONS = [
  "#1E4FFF", "#111013", "#8A877F", "#B23A48", "#1F7A5C", "#B8860B",
];

export default function ProjectModal({
  project,
  onClose,
  onSave,
  onDelete,
}: {
  project?: Project | null;
  onClose: () => void;
  onSave: (data: Partial<Project>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const today = toISODate(localToday());
  const initialName = project?.name || "";
  const initialClient = project?.client || "";
  const initialColor = project?.color || COLOR_OPTIONS[0];
  const initialStartDate = project ? project.startDate.slice(0, 10) : today;
  const initialEndDate = project ? project.endDate.slice(0, 10) : today;
  const initialNotes = project?.notes || "";

  const [name, setName] = useState(initialName);
  const [client, setClient] = useState(initialClient);
  const [color, setColor] = useState(initialColor);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const dirty =
    name !== initialName ||
    client !== initialClient ||
    color !== initialColor ||
    startDate !== initialStartDate ||
    endDate !== initialEndDate ||
    notes !== initialNotes;

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
    if (!name || !startDate || !endDate) return;
    setSaving(true);
    await onSave({ name, client: client || null, color, startDate, endDate, notes: notes || null });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4" onClick={attemptClose}>
      <div className="bg-surface w-full max-w-md p-6 border border-line" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink mb-4">
          <span className="relative top-[1px] left-[-1px] inline-block">●</span>
          {project ? "Editar proyecto" : "Nuevo proyecto"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Cliente</label>
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Fecha inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fecha fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#111013" : "transparent",
                  }}
                  aria-label={c}
                />
              ))}
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000"} onChange={(e) => setColor(e.target.value)} className="w-7 h-7 rounded-full border border-line cursor-pointer p-0" aria-label="Color personalizado" />
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#1E4FFF" className="text-xs border border-line rounded px-2 py-1.5 w-24 font-mono bg-surface text-ink" />
            </div>
          </div>

          <div>
          <label className="block text-xs font-medium mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="URL, instrucciones o cualquier nota útil"
            className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
            />
          </div>

          {confirmingDelete ? (
            <div className="pt-2 space-y-3">
              <p className="text-xs">
                ¿Estás seguro que deseas eliminar el proyecto “{project?.name}”?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs px-3 py-2 border border-line"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => project && onDelete && onDelete(project.id)}
                  className="text-xs px-3 py-2 bg-red-600 text-paper"
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
                  className="text-xs px-3 py-2 border border-line"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs px-3 py-2 bg-red-600 text-paper"
                >
                  Salir sin guardar
                </button>
              </div>
            </div>
          ) : (
          <div className="flex items-center justify-between pt-2">
            <div>
              {project && onDelete && !confirmingDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="text-xs text-red-600"
                >
                  Eliminar proyecto
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={attemptClose}
                className="text-xs px-3 py-2 border border-line"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !name}
                className="text-xs px-3 py-2 bg-ink text-paper disabled:opacity-40"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
