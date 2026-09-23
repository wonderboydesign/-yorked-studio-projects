"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Task, Project } from "@/lib/types";
import {
  parseDate,
  addDays,
  daysBetween,
  localToday,
  MONTH_NAMES,
} from "@/lib/date";

type Zoom = "day" | "wide" | "wide2" | "wide3";

const ZOOM_CONFIG: Record<Zoom, { pxPerDay: number; label: string }> = {
  day: { pxPerDay: 34, label: "x1" },
  wide: { pxPerDay: 60, label: "x2" },
  wide2: { pxPerDay: 120, label: "x3" },
  wide3: { pxPerDay: 240, label: "x4" },
};

interface Column {
  startDate: Date;
  days: number;
  label: string;
}

export default function GanttView({
  tasks,
  projects,
  onSelectTask,
  onSelectProject,
}: {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (t: Task) => void;
  onSelectProject: (p: Project) => void;
}) {
  const [zoom, setZoom] = useState<Zoom>("day");
  const scrollRef = useRef<HTMLDivElement>(null);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const { rangeStart, rangeEnd } = useMemo(() => {
    const allDates: Date[] = [];
    tasks.forEach((t) => {
      allDates.push(parseDate(t.startDate), parseDate(t.endDate));
    });
    projects.forEach((p) => {
      allDates.push(parseDate(p.startDate), parseDate(p.endDate));
    });
    if (allDates.length === 0) {
      const now = localToday();
      return {
        rangeStart: addDays(now, -7),
        rangeEnd: addDays(now, 30),
      };
    }
    const min = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())));
    return { rangeStart: addDays(min, -4), rangeEnd: addDays(max, 10) };
  }, [tasks, projects]);

  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1);
  const pxPerDay = ZOOM_CONFIG[zoom].pxPerDay;
  const totalWidth = totalDays * pxPerDay;

  const { topRow, subRow } = useMemo(
    () => buildColumns(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
  );

  const todayOffset = daysBetween(rangeStart, localToday()) * pxPerDay;

  const rows = useMemo(() => {
    const byProject: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      byProject[t.projectId] = byProject[t.projectId] || [];
      byProject[t.projectId].push(t);
    });
    return projects
      .filter((p) => byProject[p.id]?.length)
      .map((p) => ({ project: p, tasks: byProject[p.id] }));
  }, [tasks, projects]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const visibleChartWidth = el.clientWidth - 180;
    el.scrollLeft = Math.max(0, todayOffset - visibleChartWidth / 2);
  }, [zoom, todayOffset]);

  if (rows.length === 0) {
    return (
      <div className="text-[10px] text-muted py-16 text-center">
        Aún no hay tareas para mostrar en el Gantt.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end gap-4 mb-3">
        {(Object.keys(ZOOM_CONFIG) as Zoom[]).map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`font-display text-xs uppercase tracking-wider ${
              zoom === z ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {zoom === z ? <span className="text-accent">●</span> : ""}
            {ZOOM_CONFIG[z].label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="inline-block max-w-full border border-line overflow-x-auto">
        <div style={{ width: totalWidth + 180 }}>
          {/* Header */}
          <div className="flex sticky top-0 bg-surface z-10 border-b border-line">
            <div className="w-[180px] shrink-0 border-r border-line sticky left-0 bg-surface z-20" />
            <div style={{ width: totalWidth }}>
              <div className="flex border-b border-line">
                {topRow.map((c, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted px-2 py-1 border-r border-line truncate uppercase"
                    style={{ width: c.days * pxPerDay }}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
              <div className="flex">
                {subRow.map((c, i) => (
                  <div
className={`font-display text-xs text-muted text-center py-1 border-r border-line ${
  c.startDate.getUTCDay() === 0 || c.startDate.getUTCDay() === 6
  ? "bg-ink/[0.07]"
  : ""
}`}
                    style={{ width: c.days * pxPerDay }}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            <div
              className="absolute top-0 bottom-0 w-px bg-accent/60 z-10"
              style={{ left: 180 + todayOffset }}
            />
            {rows.map(({ project, tasks: projectTasks }) => (
              <div key={project.id} className="flex border-b border-line">
                <div className="w-[180px] shrink-0 border-r border-line px-3 py-2 sticky left-0 bg-surface z-20">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </span>
                </div>
                <div
                  className="relative"
                  style={{ width: totalWidth, minHeight: projectTasks.length * 34 + 8 }}
                >
                  {projectTasks.map((t, i) => {
                    const offset = daysBetween(rangeStart, parseDate(t.startDate));
                    const duration = Math.max(
                      daysBetween(parseDate(t.startDate), parseDate(t.endDate)) + 1,
                      1
                    );
                    return (
                      <button
                        key={t.id}
                        onClick={() => onSelectTask(t)}
className={`absolute h-6 rounded text-[11px] text-white px-2 flex items-center truncate text-left ${t.status === "DONE" ? "line-through opacity-60" : ""}`}
                        style={{
                          left: offset * pxPerDay,
                          width: Math.max(duration * pxPerDay - 2, 8),
                          top: 4 + i * 30,
                          backgroundColor: project.color,
                        }}
                        title={t.name}
                      >
                        {duration * pxPerDay > 40 ? t.name : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildColumns(
  rangeStart: Date,
  rangeEnd: Date
  ): { topRow: Column[]; subRow: Column[] } {
  const totalDays = daysBetween(rangeStart, rangeEnd);

  const subRow: Column[] = [];
  let cursor = new Date(rangeStart);
  let remaining = totalDays;
  while (remaining > 0) {
    const days = Math.min(1, remaining);
    subRow.push({
      startDate: new Date(cursor),
      days,
      label: String(cursor.getUTCDate()),
    });
    cursor = addDays(cursor, days);
    remaining -= days;
  }
  const topRow = groupByMonth(subRow);
  return { topRow, subRow };
}

function groupByMonth(cells: Column[]): Column[] {
  const groups: Column[] = [];
  cells.forEach((c) => {
    const key = `${c.startDate.getUTCFullYear()}-${c.startDate.getUTCMonth()}`;
    const last = groups[groups.length - 1];
    const lastKey = last
    ? `${last.startDate.getUTCFullYear()}-${last.startDate.getUTCMonth()}`
      : null;
    if (lastKey === key) {
      last.days += c.days;
    } else {
      groups.push({
        startDate: c.startDate,
        days: c.days,
        label: `${MONTH_NAMES[c.startDate.getUTCMonth()]} ${c.startDate.getUTCFullYear()}`,
      });
    }
  });
  return groups;
}
