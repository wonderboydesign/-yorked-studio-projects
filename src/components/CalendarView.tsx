"use client";

import { useEffect, useState } from "react";
import { Task, Project } from "@/lib/types";
import { parseDate, startOfMonth, startOfWeek, addMonths, addDays, localToday, MONTH_NAMES, WEEKDAY_LETTERS } from "@/lib/date";

type View = "day" | "week" | "month";

export default function CalendarView({
  tasks,
  projects,
  onSelectTask,
  onCreateTask,
}: {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (t: Task) => void;
  onCreateTask: (date: Date) => void;
}) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(localToday());
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  useEffect(() => {
    if (window.innerWidth < 768) {
      setView("day");
      setCursor(localToday());
    }
  }, []);

  const monthStart = startOfMonth(cursor);
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7; // lunes = 0
  const monthGridStart = addDays(monthStart, -firstWeekday);
  const weekGridStart = startOfWeek(cursor);
  const gridStart = view === "month" ? monthGridStart : view === "week" ? weekGridStart : cursor;
  const cellCount = view === "month" ? 42 : view === "week" ? 5 : 1;
  const cells = Array.from({ length: cellCount }, (_, i) => addDays(gridStart, i));

  function tasksOnDay(day: Date) {
    return tasks.filter((t) => {
      const start = parseDate(t.startDate);
      const end = parseDate(t.endDate);
      return day >= stripTime(start) && day <= stripTime(end);
    });
  }

  function stripTime(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  function goPrev() {
    if (view === "day") setCursor(addDays(cursor, -1));
    else if (view === "week") setCursor(addDays(cursor, -7));
    else setCursor(addMonths(cursor, -1));
  }

  function goNext() {
    if (view === "day") setCursor(addDays(cursor, 1));
    else if (view === "week") setCursor(addDays(cursor, 7));
    else setCursor(addMonths(cursor, 1));
  }

  function goToday() {
    setCursor(view === "month" ? startOfMonth(localToday()) : localToday());
  }

  function title() {
    if (view === "month") return `${MONTH_NAMES[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
    if (view === "day") {
      const label = cursor.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    const end = addDays(weekGridStart, 4);
    const startLabel = `${weekGridStart.getUTCDate()} ${MONTH_NAMES[weekGridStart.getUTCMonth()].slice(0, 3)}`;
    const endLabel = `${end.getUTCDate()} ${MONTH_NAMES[end.getUTCMonth()].slice(0, 3)}`;
    return `${startLabel} - ${endLabel} ${end.getUTCFullYear()}`;
  }

  const cellHeight = view === "month" ? "min-h-[92px]" : view === "week" ? "min-h-[360px]" : "min-h-[420px]";
  const gridCols = view === "day" ? "grid-cols-1" : view === "week" ? "grid-cols-5" : "grid-cols-7";

  return (
    <div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <h3 className="text-2xl text-ink text-center sm:text-left">
          {title()}
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button onClick={() => { setView("day"); setCursor(localToday()); }} className={`text-sm ${view === "day" ? "text-ink" : "text-muted hover:text-ink"}`}>{view === "day" ? <span className="text-ink text-[10px] mr-1 relative -top-px">●</span> : ""}Día</button>
          <button onClick={() => { setView("week"); setCursor(localToday()); }} className={`text-sm ${view === "week" ? "text-ink" : "text-muted hover:text-ink"}`}>{view === "week" ? <span className="text-ink text-[10px] mr-1 relative -top-px">●</span> : ""}Semana</button>
          <button onClick={() => setView("month")} className={`text-sm ${view === "month" ? "text-ink" : "text-muted hover:text-ink"}`}>{view === "month" ? <span className="text-ink text-[10px] mr-1 relative -top-px">●</span> : ""}Mes</button>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="text-sm px-3 py-1.5 glass glass-hover text-ink rounded-full"
            >
              ←
            </button>
            <button
              onClick={goToday}
              className="text-sm px-3 py-1.5 glass glass-hover text-ink rounded-full"
            >
              Hoy
            </button>
            <button
              onClick={goNext}
              className="text-sm px-3 py-1.5 glass glass-hover text-ink rounded-full"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className={`grid ${gridCols} glass rounded-3xl overflow-hidden`}>
        {view !== "day" && (view === "week" ? WEEKDAY_LETTERS.slice(0, 5) : WEEKDAY_LETTERS).map((d, i) => (
          <div
            key={i}
            className="text-xs text-muted text-center py-3 border-r border-b border-ink/[0.06] last:border-r-0"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const inMonth = view !== "month" || day.getUTCMonth() === cursor.getUTCMonth();
          const dayTasks = tasksOnDay(day);
          const isToday =
            stripTime(day).getTime() === localToday().getTime();
          return (
            <div
              key={i}
              className={`border-r border-b border-ink/[0.06] ${cellHeight} p-1.5 ${
                isToday && view !== "day" ? "bg-ink/[0.06]" : inMonth ? "" : "bg-ink/[0.015]"
              }`}
            >
              <span
                onClick={() => onCreateTask(day)}
                className={`font-display text-xs inline-flex items-center justify-center w-5 h-5 rounded-full cursor-pointer hover:bg-ink/[0.08] ${
                  isToday ? "bg-accent text-accent-fg" : inMonth ? "" : "text-muted"
                }`}
>
                {day.getUTCDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayTasks.map((t) => {
                  const project = projectMap[t.projectId];
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTask(t)}
className={`w-full text-left text-xs leading-tight px-1.5 py-0.5 rounded ${
  t.status === "DONE" ? "line-through" : ""
}`}
                      style={
                        t.status === "DONE"
                        ? { backgroundColor: "#E8E8E6", color: "#9C9A94" }
                        : {
                          backgroundColor: `${project?.color}1A`,
                          color: project?.color,
                        }
                      }
                      title={t.name}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
