"use client";

import { Task, Project, Status, STATUS_LABELS, STATUS_ORDER, STATUS_COLORS } from "@/lib/types";
import { parseDate, formatShort, capMonth } from "@/lib/date";
import { dueTone, DUE_TEXT_CLASS } from "@/lib/dueTone";
import AvatarStack from "./AvatarStack";

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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="min-h-[200px]">
            <div
              className="flex items-center justify-between px-1 pb-2.5 mb-3 border-t-2"
              style={{ borderTopColor: STATUS_COLORS[status] }}
            >
              <h3 className="font-mono text-[12px] uppercase tracking-[0.15em] text-ink pt-2.5">
                {STATUS_LABELS[status]}
              </h3>
              <span className="font-mono text-[12px] text-muted pt-2.5">{columnTasks.length}</span>
            </div>
            <div className="space-y-2">
              {columnTasks.map((t) => {
                const project = projectMap[t.projectId];
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="bg-surface border border-line p-3 cursor-pointer hover:border-ink transition-colors rounded-2xl"
                  >
                    <p className="text-sm mb-2.5">{t.name}</p>
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide"
                        style={{ color: project?.color }}
                      >
                        {project?.name}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted shrink-0">
                        <AvatarStack users={t.assignees} size={20} />
                        <span className={DUE_TEXT_CLASS[dueTone(t.endDate, t.status)]}>
                          {capMonth(formatShort(parseDate(t.endDate)))}
                        </span>
                      </span>
                    </div>
                    <select
                      value={t.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        onChangeStatus(t.id, e.target.value as Status)
                      }
                      className="mt-2.5 w-full appearance-none font-mono text-[11px] uppercase tracking-wide border border-line px-1.5 py-1.5 bg-surface rounded-xl"
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
