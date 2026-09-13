"use client";

import { useEffect } from "react";
import { Project } from "@/lib/types";

export default function ProjectsPanel({
  projects,
  onClose,
  onToggleArchived,
  onEditProject,
}: {
  projects: Project[];
  onClose: () => void;
  onToggleArchived: (id: string, archived: boolean) => void;
  onEditProject: (p: Project) => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg w-full max-w-lg p-6 border border-line max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-xs uppercase tracking-wider">Proyectos</h2>
          <button onClick={onClose} className="text-xs text-muted">
            Cerrar
          </button>
        </div>

        <h3 className="font-display text-xs font-medium text-muted mb-2 uppercase tracking-wide">
          Activos ({active.length})
        </h3>
        <div className="space-y-1 mb-6">
          {active.length === 0 && (
            <p className="text-[10px] text-muted">No hay proyectos activos.</p>
          )}
          {active.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border border-line rounded-md px-3 py-2 gap-2"
            >
              <button
                onClick={() => onEditProject(p)}
                className="flex items-center gap-2 min-w-0 text-left hover:underline"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-xs truncate">{p.name}</span>
              </button>
              <button
                onClick={() => onToggleArchived(p.id, true)}
                className="text-xs px-2.5 py-1 rounded-md border border-line shrink-0"
              >
                Archivar
              </button>
            </div>
          ))}
        </div>

        <h3 className="font-display text-xs font-medium text-muted mb-2 uppercase tracking-wide">
          Archivados ({archived.length})
        </h3>
        <div className="space-y-1">
          {archived.length === 0 && (
            <p className="text-[10px] text-muted">No hay proyectos archivados.</p>
          )}
          {archived.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border border-line rounded-md px-3 py-2 gap-2 opacity-60"
            >
              <button
                onClick={() => onEditProject(p)}
                className="flex items-center gap-2 min-w-0 text-left hover:underline"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-xs truncate">{p.name}</span>
              </button>
              <button
                onClick={() => onToggleArchived(p.id, false)}
                className="text-xs px-2.5 py-1 rounded-md border border-line shrink-0"
              >
                Desarchivar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
