"use client";

import { useEffect, useState } from "react";
import { Task, Project, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { parseDate, localToday, addDays, formatLong, capMonth } from "@/lib/date";

function stripTime(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  link?: string;
};

function formatEventTime(e: CalendarEvent) {
  if (e.allDay) return "Todo el día";
  const d = new Date(e.start);
  return d.toLocaleString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardView({
  tasks,
  projects,
  onSelectTask,
  onOpenProjects,
  currentUserName,
  onLogout,
}: {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (t: Task) => void;
  onOpenProjects: () => void;
  currentUserName?: string;
  onLogout: () => void;
}) {
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
  const today = localToday();
  const weekEnd = addDays(today, 6);

  const openTasks = tasks.filter((t) => t.status !== "DONE");

  const overdue = openTasks
    .filter((t) => stripTime(parseDate(t.endDate)) < today)
    .sort((a, b) => parseDate(a.endDate).getTime() - parseDate(b.endDate).getTime());

  const thisWeek = openTasks
    .filter((t) => {
      const start = stripTime(parseDate(t.startDate));
      const end = stripTime(parseDate(t.endDate));
      return start <= weekEnd && end >= today;
    })
    .sort((a, b) => parseDate(a.endDate).getTime() - parseDate(b.endDate).getTime());

  const dueSoon = openTasks
    .filter((t) => {
      const end = stripTime(parseDate(t.endDate));
      return end >= today && end <= weekEnd;
    })
    .sort((a, b) => parseDate(a.endDate).getTime() - parseDate(b.endDate).getTime());

  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [calendarExpired, setCalendarExpired] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((data) => {
        setCalendarConnected(data.connected);
        setCalendarExpired(!!data.expired);
        setCalendarEvents(data.events || []);
      })
      .catch(() => setCalendarConnected(false))
      .finally(() => setCalendarLoading(false));

    if (typeof window !== "undefined" && window.location.search.includes("google=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleDisconnectCalendar() {
    await fetch("/api/calendar/disconnect", { method: "POST" });
    setCalendarConnected(false);
    setCalendarEvents([]);
  }

  function TaskRow({ t, showDate = true }: { t: Task; showDate?: boolean }) {
    const project = projectMap[t.projectId];
    return (
      <button
        onClick={() => onSelectTask(t)}
        className="w-full flex items-start justify-between gap-3 py-2 text-left hover:bg-ink/[0.03] px-2 -mx-2 rounded-md"
      >
        <div className="min-w-0 flex items-start gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block shrink-0 mt-1"
            style={{ backgroundColor: project?.color }}
          />
          <div className="min-w-0">
            <span className="text-xs block">{t.name}</span>
            <span className="text-[10px] text-muted truncate hidden sm:block">{project?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showDate && (
            <span className="text-[10px] text-muted whitespace-nowrap">
              {capMonth(formatLong(parseDate(t.endDate)))}
            </span>
          )}
          <span
            className="text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap"
            style={{ backgroundColor: STATUS_COLORS[t.status], color: "#262626" }}
          >
            {STATUS_LABELS[t.status]}
          </span>
        </div>
      </button>
    );
  }

  function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="border border-line rounded-lg p-6">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted mb-4">{title}</h3>
        {children}
      </div>
    );
  }

  function Empty({ text }: { text: string }) {
    return <p className="text-[10px] text-muted py-2">{text}</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-baseline gap-4 mb-6">
          <h2 className="text-5xl font-semibold tracking-tight leading-none">{thisWeek.length}</h2>
          <p className="text-sm text-muted">
            {thisWeek.length === 1 ? "tarea pendiente esta semana" : "tareas pendientes esta semana"}
          </p>
        </div>
        <div className="border border-line rounded-lg p-6">
          {thisWeek.length === 0 ? (
            <Empty text="No tienes tareas pendientes esta semana." />
          ) : (
            <div className="divide-y divide-line">
              {thisWeek.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Tareas atrasadas">
          {overdue.length === 0 ? (
            <Empty text="No tienes tareas atrasadas." />
          ) : (
            <div className="divide-y divide-line">
              {overdue.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Tareas por vencer">
          {dueSoon.length === 0 ? (
            <Empty text="No tienes tareas por vencer esta semana." />
          ) : (
            <div className="divide-y divide-line">
              {dueSoon.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Reuniones">
          {calendarLoading ? (
            <Empty text="Cargando…" />
          ) : !calendarConnected ? (
            <div className="py-1">
              <p className="text-[10px] text-muted mb-3">
                {calendarExpired
                  ? "Tu conexión con Google Calendar expiró. Vuelve a conectarla para seguir viendo tus reuniones."
                  : "Conecta tu Google Calendar para ver tus próximas reuniones aquí."}
              </p>
              <a
                href="/api/auth/google"
                className="inline-block font-display text-xs tracking-wider text-ink bg-button hover:bg-button-hover transition-colors px-3 py-1.5 rounded-md"
              >
                {calendarExpired ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
              </a>
            </div>
          ) : calendarEvents.length === 0 ? (
            <div className="py-1">
              <Empty text="No tienes reuniones en los próximos días." />
              <button
                onClick={handleDisconnectCalendar}
                className="font-display text-[10px] tracking-wider text-muted hover:text-ink"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-line">
                {calendarEvents.map((e) => (
                  <a
                    key={e.id}
                    href={e.link || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 hover:bg-ink/[0.03] px-2 -mx-2 rounded-md"
                  >
                    <p className="text-xs truncate">{e.title}</p>
                    <p className="text-[10px] text-muted">{formatEventTime(e)}</p>
                  </a>
                ))}
              </div>
              <button
                onClick={handleDisconnectCalendar}
                className="font-display text-[10px] tracking-wider text-muted hover:text-ink mt-3"
              >
                Desconectar
              </button>
            </>
          )}
        </Card>
      </div>

      <div className="flex items-center justify-end gap-5 pt-2">
        {currentUserName && (
          <span className="font-display text-xs tracking-wider text-muted">
            Hola, {currentUserName}
          </span>
        )}
        <button
          onClick={onOpenProjects}
          className="font-display text-xs tracking-wider text-muted hover:text-ink"
        >
          Proyectos
        </button>
        <button
          onClick={onLogout}
          className="font-display text-xs tracking-wider text-muted hover:text-ink"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
