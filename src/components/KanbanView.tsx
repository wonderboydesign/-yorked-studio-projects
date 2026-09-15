"use client";

import { Task, Project, Status, STATUS_LABELS, STATUS_ORDER, STATUS_COLORS } from "@/lib/types";
import { parseDate, formatShort, capMonth } from "@/lib/date";

export default function KanbanView({
  tasks,
  projects,
  onSelectTask,
  onChangeStatus,
}: {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (t: Task) => void;
  onChangeStatus: (taskId: string, status: Status) => void;
}) {
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="rounded-lg p-3 min-h-[200px]" style={{ backgroundColor: STATUS_COLORS[status] }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xs tracking-wider" style={{ color: "#262626" }}>{STATUS_LABELS[status]}</h3>
              <span className="font-display text-xs" style={{ color: "#6b6b6b" }}>{columnTasks.length}</span>
            </div>
            <div className="space-y-2">
              {columnTasks.map((t) => {
                const project = projectMap[t.projectId];
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="bg-surface border border-line rounded-md p-3 cursor-pointer hover:border-ink/30"
                  >
                    <p className="text-xs mb-2">{t.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: project?.color }}
                        />
                        {project?.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-muted shrink-0">
                        <span className="truncate max-w-[80px]">{t.assignee?.name || "—"}</span>
                        <span>{capMonth(formatShort(parseDate(t.endDate)))}</span>
                      </span>
                    </div>
                    <select
                      value={t.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        onChangeStatus(t.id, e.target.value as Status)
                      }
                      className="mt-2 w-full text-xs border border-line rounded px-1.5 py-1 bg-surface"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
