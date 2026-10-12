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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="min-h-[320px] rounded-3xl bg-ink/[0.025] p-3">
            <div
              className="flex items-center justify-between px-3 pt-2 pb-4"
            >
              <h3 className="inline-flex items-center gap-2 text-base text-ink">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} aria-hidden="true" />
                {STATUS_LABELS[status]}
              </h3>
              <span className="text-sm text-muted">{columnTasks.length}</span>
            </div>
            <div className="space-y-2">
              {columnTasks.map((t) => {
                const project = projectMap[t.projectId];
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="glass glass-hover p-4 cursor-pointer rounded-2xl"
                  >
                    <p className="text-sm mb-2.5">{t.name}</p>
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 font-mono text-xs"
                        style={{ color: project?.color }}
                      >
                        {project?.name}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-muted shrink-0">
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
                      className="mt-2.5 w-full appearance-none font-mono text-xs field px-2 py-1.5 rounded-xl"
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
