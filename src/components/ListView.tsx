"use client";

import { Task, Project, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { parseDate, formatLong, capMonth } from "@/lib/date";

export default function ListView({
  tasks,
  projects,
  onSelectTask,
}: {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (t: Task) => void;
}) {
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
  const sorted = [...tasks].sort(
    (a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-[10px] text-muted py-16 text-center">
        Aún no hay tareas. Crea un proyecto y agrega tu primera tarea.
      </div>
    );
  }

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-muted border-b-2 border-ink">
          <th className="pl-0 pr-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[10px]">Tarea</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[10px]">Proyecto</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[10px]">Inicio</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[10px]">Fin</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[10px]">Asignado</th>
          <th className="px-4 py-3 font-mono font-normal uppercase tracking-[0.12em] text-[10px]">Estado</th>
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
              <td className="pl-0 pr-4 py-3.5 text-ink text-sm">{t.name}</td>
              <td className="px-4 py-3.5">
                <span
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide"
                  style={{ color: project?.color }}
                >
                  {project?.name || "—"}
                </span>
              </td>
              <td className="px-4 py-3.5 text-[10px] text-muted">{capMonth(formatLong(parseDate(t.startDate)))}</td>
              <td className="px-4 py-3.5 text-[10px] text-muted">{capMonth(formatLong(parseDate(t.endDate)))}</td>
              <td className="px-4 py-3.5 text-[10px] text-muted">{t.assignee?.name || "—"}</td>
              <td className="px-4 py-3.5">
                <span
                  className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1"
                  style={{ backgroundColor: STATUS_COLORS[t.status], color: "#262626" }}
                >
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
