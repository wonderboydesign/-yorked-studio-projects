"use client";

import { useEffect, useState } from "react";
import { Task, Project, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { parseDate, localToday, addDays, formatLong, capMonth } from "@/lib/date";
import { ArrowUpRight, HeroTitle, Marquee, OverHero, appear, heroSize } from "./Glass";

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
  onOpenProject,
  currentUserName,
  onLogout,
}: {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (t: Task) => void;
  onOpenProjects: () => void;
  onOpenProject?: (projectId: string) => void;
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
        className="w-full flex items-start justify-between gap-3 py-3 text-left hover:bg-ink/[0.03] px-3 -mx-3 rounded-xl transition-colors"
      >
        <div className="min-w-0 flex items-start gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0 mt-1.5"
            style={{ backgroundColor: project?.color }}
          />
          <div className="min-w-0">
            <span className="text-sm block">{t.name}</span>
            <span className="text-xs text-muted truncate hidden sm:block">{project?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showDate && (
            <span className="text-xs text-muted whitespace-nowrap">
              {capMonth(formatLong(parseDate(t.endDate)))}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-ink bg-ink/[0.05] px-2.5 py-1 whitespace-nowrap rounded-lg">
            <span
              className="w-1.5 h-1.5 inline-block shrink-0 rounded-full ring-1 ring-ink/20"
              style={{ backgroundColor: STATUS_COLORS[t.status] }}
            />
            {STATUS_LABELS[t.status]}
          </span>
        </div>
      </button>
    );
  }

  function Card({
    title,
    count,
    index,
    className = "",
    children,
  }: {
    title: string;
    count?: number;
    index: number;
    className?: string;
    children: React.ReactNode;
  }) {
    const a = appear(index);
    return (
      <section className={`glass p-6 sm:p-8 rounded-3xl flex flex-col ${a.className} ${className}`} style={a.style}>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h3 className="text-xl text-ink">{title}</h3>
          {count !== undefined && <span className="text-sm text-muted">{count}</span>}
        </div>
        {children}
      </section>
    );
  }

  function Empty({ text }: { text: string }) {
    return <p className="text-sm text-muted py-2">{text}</p>;
  }

  const firstName = currentUserName?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const heroText = firstName ? `Hola, ${firstName}` : "Hola";
  const size = heroSize(heroText);
  // Con pocos proyectos se repiten para que la fila no deje huecos
  const marqueeProjects =
    projects.length === 0 ? [] : Array.from({ length: Math.ceil(8 / projects.length) }, () => projects).flat();

  return (
    <div className="pb-8">
      <HeroTitle
        eyebrow={`${greeting}${firstName ? `, ${firstName}` : ""}`}
        aside={`${thisWeek.length} ${thisWeek.length === 1 ? "tarea" : "tareas"} esta semana`}
        size={size}
      >
        {heroText}
      </HeroTitle>

      <OverHero size={size} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card title="Esta semana" count={thisWeek.length} index={0} className="lg:col-span-8 min-h-[320px] hero-pad">
          {thisWeek.length === 0 ? (
            <Empty text="No tienes tareas pendientes esta semana." />
          ) : (
            <div className="divide-y divide-ink/[0.06]">
              {thisWeek.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-4 grid gap-4 content-start">
          <section
            className={`glass rounded-3xl py-6 sm:py-8 lg:hero-pad ${appear(1).className}`}
            style={appear(1).style}
          >
            <div className="flex items-baseline justify-between px-6 sm:px-8 mb-5">
              <h3 className="text-xl text-ink">Proyectos</h3>
              <button onClick={onOpenProjects} className="group inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="px-6 sm:px-8 text-sm text-muted">Sin proyectos activos.</p>
            ) : (
              <Marquee seconds={Math.max(18, marqueeProjects.length * 3)}>
                {marqueeProjects.map((p, i) => (
                  <button
                    key={`${p.id}-${i}`}
                    onClick={() => onOpenProject?.(p.id)}
                    title={`${p.name} — abrir en Branding`}
                    className="w-[72px] h-[72px] shrink-0 rounded-2xl bg-ink/[0.05] hover:bg-ink/[0.09] transition-colors flex flex-col items-center justify-center gap-1.5"
                  >
                    <span className="w-6 h-6 rounded-lg" style={{ backgroundColor: p.color }} />
                    <span className="text-[11px] text-ink leading-none max-w-[60px] truncate">
                      {p.name.split(" ").map((w) => w[0]).join("").slice(0, 3)}
                    </span>
                  </button>
                ))}
              </Marquee>
            )}
          </section>

          <Card title="Reuniones" index={2}>
            {calendarLoading ? (
              <Empty text="Cargando…" />
            ) : !calendarConnected ? (
              <div className="py-1">
                <p className="text-sm text-muted mb-4">
                  {calendarExpired
                    ? "Tu conexión con Google Calendar expiró. Vuelve a conectarla para seguir viendo tus reuniones."
                    : "Conecta tu Google Calendar para ver tus próximas reuniones aquí."}
                </p>
                <a
                  href="/api/auth/google"
                  className="group inline-flex items-center gap-2 text-sm text-accent-fg bg-accent hover:opacity-90 transition-opacity px-4 py-2 rounded-xl"
                >
                  {calendarExpired ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="py-1">
                <Empty text="No tienes reuniones en los próximos días." />
                <button onClick={handleDisconnectCalendar} className="text-xs text-muted hover:text-ink mt-2">
                  Desconectar
                </button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-ink/[0.06]">
                  {calendarEvents.map((e) => (
                    <a
                      key={e.id}
                      href={e.link || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3 py-3 hover:bg-ink/[0.03] px-3 -mx-3 rounded-xl transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm truncate">{e.title}</span>
                        <span className="block text-xs text-muted">{formatEventTime(e)}</span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-muted" />
                    </a>
                  ))}
                </div>
                <button onClick={handleDisconnectCalendar} className="text-xs text-muted hover:text-ink mt-3 self-start">
                  Desconectar
                </button>
              </>
            )}
          </Card>
        </div>

        <Card title="Atrasadas" count={overdue.length} index={3} className="lg:col-span-6">
          {overdue.length === 0 ? (
            <Empty text="No tienes tareas atrasadas." />
          ) : (
            <div className="divide-y divide-ink/[0.06]">
              {overdue.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Por vencer" count={dueSoon.length} index={4} className="lg:col-span-6">
          {dueSoon.length === 0 ? (
            <Empty text="No tienes tareas por vencer esta semana." />
          ) : (
            <div className="divide-y divide-ink/[0.06]">
              {dueSoon.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </Card>
      </OverHero>

      <div className="flex items-center justify-end gap-6 pt-6">
        {currentUserName && <span className="text-sm text-muted">{currentUserName}</span>}
        <button onClick={onOpenProjects} className="text-sm text-muted hover:text-ink">
          Proyectos
        </button>
        <button onClick={onLogout} className="text-sm text-muted hover:text-ink">
          Salir
        </button>
      </div>
    </div>
  );
}
