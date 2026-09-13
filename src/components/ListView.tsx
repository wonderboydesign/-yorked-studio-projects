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
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted">
          <th className="pl-0 pr-4 py-2 font-display">Tarea</th>
          <th className="px-4 py-2 font-display">Proyecto</th>
          <th className="px-4 py-2 font-display">Inicio</th>
          <th className="px-4 py-2 font-display">Fin</th>
          <th className="px-4 py-2 font-display">Estado</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((t) => {
          const project = projectMap[t.projectId];
          return (
            <tr
              key={t.id}
              onClick={() => onSelectTask(t)}
              className="cursor-pointer hover:bg-ink/[0.03]"
            >
              <td className="pl-0 pr-4 py-2.5 text-ink">{t.name}</td>
              <td className="px-4 py-2.5">
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: project?.color }}
                >
                  {project?.name || "—"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[10px] text-muted">{capMonth(formatLong(parseDate(t.startDate)))}</td>
              <td className="px-4 py-2.5 text-[10px] text-muted">{capMonth(formatLong(parseDate(t.endDate)))}</td>
              <td className="px-4 py-2.5">
                <span
                  className="text-[11px] px-2.5 py-1 rounded-md"
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
