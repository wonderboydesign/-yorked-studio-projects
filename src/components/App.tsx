"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Project, Task, User, Status } from "@/lib/types";
import { toISODate } from "@/lib/date";
import ProjectModal from "./ProjectModal";
import TaskModal from "./TaskModal";
import ListView from "./ListView";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import GanttView from "./GanttView";
import ProjectsPanel from "./ProjectsPanel";
import DashboardView from "./DashboardView";
import TeamPanel from "./TeamPanel";
import NotificationBell from "./NotificationBell";

type View = "dashboard" | "gantt" | "list" | "kanban" | "calendar";

const VIEWS: { key: View; label: string; mobileLabel: string }[] = [
  { key: "gantt", label: "Gantt", mobileLabel: "Gantt" },
  { key: "list", label: "Lista", mobileLabel: "Lista" },
  { key: "kanban", label: "Kanban", mobileLabel: "Kanban" },
  { key: "calendar", label: "Calendario", mobileLabel: "Calendar" },
];

export default function App() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectsPanelOpen, setProjectsPanelOpen] = useState(false);
  const [teamPanelOpen, setTeamPanelOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {}
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (addMenuRef.current && !addMenuRef.current.contains(target)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project | null }>({
    open: false,
  });
  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    task?: Task | null;
    defaultStartDate?: string;
  }>({
    open: false,
  });

  const load = useCallback(async () => {
    const [projectsRes, tasksRes, usersRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/tasks"),
      fetch("/api/users"),
    ]);
    setProjects(await projectsRes.json());
    setTasks(await tasksRes.json());
    setUsers(await usersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (projectFilter === "all") return;
    if (!projects.some((p) => p.id === projectFilter && !p.archived)) {
      setProjectFilter("all");
    }
  }, [projects, projectFilter]);

  async function saveProject(data: Partial<Project>) {
    if (projectModal.project) {
      await fetch(`/api/projects/${projectModal.project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setProjectModal({ open: false });
    await load();
  }

  async function toggleArchived(id: string, archived: boolean) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived } : p)));
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
  }

  async function deleteProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjectModal({ open: false });
    await load();
  }

  async function saveTask(data: Partial<Task>) {
    if (taskModal.task) {
      await fetch(`/api/tasks/${taskModal.task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setTaskModal({ open: false });
    await load();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTaskModal({ open: false });
    await load();
  }

  async function changeTaskStatus(taskId: string, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjectIds = new Set(projects.filter((p) => p.archived).map((p) => p.id));
  const visibleTasks = tasks.filter((t) => !archivedProjectIds.has(t.projectId));
  const projectScopedTasks =
    projectFilter === "all"
      ? visibleTasks
      : visibleTasks.filter((t) => t.projectId === projectFilter);
  const filteredTasks =
    myTasksOnly && currentUser
      ? projectScopedTasks.filter((t) => t.assigneeId === currentUser.id)
      : projectScopedTasks;

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-8 sm:-translate-y-[11px] w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setView("dashboard")}
            className="font-sans text-lg font-bold tracking-tight text-ink hover:opacity-70 transition-opacity"
          >
           <img src="/logo-header.png" alt="Logo" className="h-8 w-auto" />
          </button>
          <nav className="flex gap-5">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`font-mono text-xs uppercase tracking-wider ${
                  view === v.key ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <span className="relative top-[1px] left-[-1px] inline-block">
                  {view === v.key ? "●" : ""}
                </span>
                <span className="sm:hidden">{v.mobileLabel}</span>
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMyTasksOnly((v) => !v)}
              disabled={!currentUser}
              className={`font-display text-xs tracking-wider rounded-full px-3 py-1.5 border transition-colors disabled:opacity-40 ${
                myTasksOnly
                  ? "border-ink text-ink bg-button"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              Mis tareas
            </button>
            <button
              onClick={() => setTeamPanelOpen(true)}
              className="font-display text-xs tracking-wider rounded-full px-3 py-1.5 border border-line text-muted hover:text-ink"
            >
              Equipo
            </button>
            <div className="relative group border border-line rounded-full px-3 py-1.5">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="appearance-none bg-transparent border-none font-display text-xs tracking-wider text-muted group-hover:text-ink pr-4 cursor-pointer focus:outline-none"
              >
                <option value="all">Todos los proyectos</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-[11px] h-auto text-muted group-hover:text-ink"
                viewBox="0 0 15.62 8.75"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  d="M0,.02v-.02h1.88v1.88H0V.02ZM2.29,2.31v-.02h1.88v1.88h-1.88v-1.85ZM4.58,4.6v-.02h1.88v1.88h-1.88v-1.85ZM6.87,6.89v-.02h1.88v1.88h-1.88v-1.85ZM9.16,4.6v-.02h1.88v1.88h-1.88v-1.85ZM11.45,2.31v-.02h1.88v1.88h-1.88v-1.85ZM13.74.02v-.02h1.88v1.88h-1.88V.02Z"
                />
              </svg>
            </div>
          </div>
          <button
            onClick={() =>
              projectFilter !== "all" &&
              setProjectModal({
                open: true,
                project: projects.find((p) => p.id === projectFilter) || null,
              })
            }
            className={`font-display text-xs tracking-wider text-muted hover:text-ink ${
              projectFilter === "all" ? "invisible" : ""
            }`}
          >
            Editar proyecto
          </button>
        </div>
      </header>

      <div className="fixed bottom-[26px] sm:bottom-4 left-6 flex items-center gap-5 z-10 bg-paper px-3 py-2 rounded-md shadow-sm">
        <button
          onClick={() => window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer")}
          className="font-display text-xs tracking-wider text-muted hover:text-ink"
        >
          Iniciar Meet
        </button>
        <button
          onClick={() => {
            const d = new Date();
            d.setMinutes(0, 0, 0);
            d.setHours(d.getHours() + 1);
            const pad = (n: number) => String(n).padStart(2, "0");
            const dates = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
              d.getHours()
            )}${pad(d.getMinutes())}00`;
            window.open(
              `https://calendar.google.com/calendar/u/0/r/eventedit?vcon=meet&dates=${dates}&hl=es`,
              "_blank",
              "noopener,noreferrer"
            );
          }}
          className="font-display text-xs tracking-wider text-muted hover:text-ink"
        >
          Programar Meet
        </button>
        <button
          onClick={() => window.open("https://wonderboy.mx/dashboard/", "_blank", "noopener,noreferrer")}
          className="font-display text-xs tracking-wider text-muted hover:text-ink"
        >
          Finanzas
        </button>
      </div>

      <div className="fixed bottom-[26px] sm:bottom-4 right-6 z-10 flex items-center gap-4">
        <NotificationBell
          enabled={!!currentUser}
          onOpenTask={(taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            if (task) setTaskModal({ open: true, task });
          }}
        />
        <button
          onClick={toggleDarkMode}
          className="transition-colors px-3 py-1.5 rounded-md flex items-center justify-center bg-button hover:bg-button-hover"
        >
          <svg width="15" height="15" viewBox="0 0 20.68 20.68" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" className="text-ink">
              <polygon points="3.76 11.26 3.76 11.28 1.88 11.28 1.88 9.4 3.76 9.4 3.76 11.26"/>
              <polygon points="3.76 9.38 3.76 9.4 1.88 9.4 1.88 7.52 3.76 7.52 3.76 9.38"/>
              <polygon points="3.76 13.14 3.76 13.16 1.88 13.16 1.88 11.28 3.76 11.28 3.76 13.14"/>
              <polygon points="5.64 15.02 5.64 15.04 3.76 15.04 3.76 13.16 5.64 13.16 5.64 15.02"/>
              <polygon points="5.64 7.5 5.64 7.52 3.76 7.52 3.76 5.64 5.64 5.64 5.64 7.5"/>
              <polygon points="11.28 13.14 11.28 13.16 9.4 13.16 9.4 11.28 11.28 11.28 11.28 13.14"/>
              <polygon points="11.28 11.26 11.28 11.28 9.4 11.28 9.4 9.4 11.28 9.4 11.28 11.26"/>
              <polygon points="11.28 9.38 11.28 9.4 9.4 9.4 9.4 7.52 11.28 7.52 11.28 9.38"/>
              <polygon points="11.28 7.5 11.28 7.52 9.4 7.52 9.4 5.64 11.28 5.64 11.28 7.5"/>
              <polygon points="11.28 5.62 11.28 5.64 9.4 5.64 9.4 3.76 11.28 3.76 11.28 5.62"/>
              <polygon points="15.04 5.62 15.04 5.64 13.16 5.64 13.16 3.76 15.04 3.76 15.04 5.62"/>
              <polygon points="18.8 9.38 18.8 9.4 16.92 9.4 16.92 7.52 18.8 7.52 18.8 9.38"/>
              <polygon points="7.52 5.62 7.52 5.64 5.64 5.64 5.64 3.76 7.52 3.76 7.52 5.62"/>
              <polygon points="11.28 3.74 11.28 3.76 9.4 3.76 9.4 1.88 11.28 1.88 11.28 3.74"/>
              <polygon points="13.16 3.74 13.16 3.76 11.28 3.76 11.28 1.88 13.16 1.88 13.16 3.74"/>
              <polygon points="16.92 7.5 16.92 7.52 15.04 7.52 15.04 5.64 16.92 5.64 16.92 7.5"/>
              <polygon points="11.28 15.02 11.28 15.04 9.4 15.04 9.4 13.16 11.28 13.16 11.28 15.02"/>
              <polygon points="18.8 11.26 18.8 11.28 16.92 11.28 16.92 9.4 18.8 9.4 18.8 11.26"/>
              <polygon points="7.52 16.9 7.52 16.92 5.64 16.92 5.64 15.04 7.52 15.04 7.52 16.9"/>
              <polygon points="11.28 16.9 11.28 16.92 9.4 16.92 9.4 15.04 11.28 15.04 11.28 16.9"/>
              <polygon points="9.4 13.14 9.4 13.16 7.52 13.16 7.52 11.28 9.4 11.28 9.4 13.14"/>
              <polygon points="9.4 11.26 9.4 11.28 7.52 11.28 7.52 9.4 9.4 9.4 9.4 11.26"/>
              <polygon points="9.4 9.38 9.4 9.4 7.52 9.4 7.52 7.52 9.4 7.52 9.4 9.38"/>
              <polygon points="9.4 7.5 9.4 7.52 7.52 7.52 7.52 5.64 9.4 5.64 9.4 7.5"/>
              <polygon points="9.4 5.62 9.4 5.64 7.52 5.64 7.52 3.76 9.4 3.76 9.4 5.62"/>
              <polygon points="9.4 15.02 9.4 15.04 7.52 15.04 7.52 13.16 9.4 13.16 9.4 15.02"/>
              <polygon points="7.52 13.14 7.52 13.16 5.64 13.16 5.64 11.28 7.52 11.28 7.52 13.14"/>
              <polygon points="7.52 11.26 7.52 11.28 5.64 11.28 5.64 9.4 7.52 9.4 7.52 11.26"/>
              <polygon points="7.52 9.38 7.52 9.4 5.64 9.4 5.64 7.52 7.52 7.52 7.52 9.38"/>
              <polygon points="5.64 13.14 5.64 13.16 3.76 13.16 3.76 11.28 5.64 11.28 5.64 13.14"/>
              <polygon points="5.64 11.26 5.64 11.28 3.76 11.28 3.76 9.4 5.64 9.4 5.64 11.26"/>
              <polygon points="5.64 9.38 5.64 9.4 3.76 9.4 3.76 7.52 5.64 7.52 5.64 9.38"/>
              <polygon points="7.52 7.5 7.52 7.52 5.64 7.52 5.64 5.64 7.52 5.64 7.52 7.5"/>
              <polygon points="7.52 15.02 7.52 15.04 5.64 15.04 5.64 13.16 7.52 13.16 7.52 15.02"/>
              <polygon points="9.4 16.9 9.4 16.92 7.52 16.92 7.52 15.04 9.4 15.04 9.4 16.9"/>
              <polygon points="16.92 15.02 16.92 15.04 15.04 15.04 15.04 13.16 16.92 13.16 16.92 15.02"/>
              <polygon points="18.8 13.14 18.8 13.16 16.92 13.16 16.92 11.28 18.8 11.28 18.8 13.14"/>
              <polygon points="9.4 18.78 9.4 18.8 7.52 18.8 7.52 16.92 9.4 16.92 9.4 18.78"/>
              <polygon points="11.28 18.78 11.28 18.8 9.4 18.8 9.4 16.92 11.28 16.92 11.28 18.78"/>
              <polygon points="13.16 18.78 13.16 18.8 11.28 18.8 11.28 16.92 13.16 16.92 13.16 18.78"/>
              <polygon points="15.04 16.9 15.04 16.92 13.16 16.92 13.16 15.04 15.04 15.04 15.04 16.9"/>
              <polygon points="9.4 3.74 9.4 3.76 7.52 3.76 7.52 1.88 9.4 1.88 9.4 3.74"/>
            </g>
          </svg>
        </button>

        <div
          ref={addMenuRef}
          onMouseEnter={() => setAddMenuOpen(true)}
          onMouseLeave={() => setAddMenuOpen(false)}
          className="relative"
        >
        {addMenuOpen && (
          <div className="absolute bottom-full right-0 pb-1.5 flex flex-col items-end gap-1.5 animate-fade-in-up">
            <button
              onClick={() => {
                setTaskModal({ open: true, task: null });
                setAddMenuOpen(false);
              }}
              disabled={activeProjects.length === 0}
              className="font-display text-xs tracking-wider text-ink bg-button hover:bg-button-hover transition-colors px-3 py-1.5 rounded-md disabled:opacity-40 whitespace-nowrap"
            >
              + Tarea
            </button>
            <button
              onClick={() => {
                setProjectModal({ open: true, project: null });
                setAddMenuOpen(false);
              }}
              className="font-display text-xs tracking-wider text-ink bg-button hover:bg-button-hover transition-colors px-3 py-1.5 rounded-md whitespace-nowrap"
            >
              + Proyecto
            </button>
          </div>
        )}
        <button
          onClick={() => setAddMenuOpen((open) => !open)}
          className={`transition-colors px-3 py-1.5 rounded-md flex items-center justify-center ${
            addMenuOpen ? "bg-button-hover" : "bg-button hover:bg-button-hover"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 20.68 20.68" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              className="text-ink"
              d="M15.04,11.26v.02h-1.88v-1.88h1.88v1.86ZM18.8,11.26v.02h-1.88v-1.88h1.88v1.86ZM3.76,11.26v.02h-1.88v-1.88h1.88v1.86ZM11.28,11.26v.02h-1.88v-1.88h1.88v1.85h0ZM7.52,11.26v.02h-1.88v-1.88h1.88v1.85h0Z"
            />
            <path
              fill="currentColor"
              className="text-ink"
              d="M11.26,5.64h.02v1.88h-1.88v-1.88h1.86ZM11.26,1.88h.02v1.88h-1.88v-1.88h1.86ZM11.26,16.92h.02v1.88h-1.88v-1.88h1.86ZM11.26,9.4h.02v1.88h-1.88v-1.88h1.86ZM11.26,13.16h.02v1.88h-1.88v-1.88h1.86Z"
            />
          </svg>
        </button>
      </div>
      </div>

      <main className="p-6 pb-24">
        {loading ? (
          <div className="fixed inset-0 flex items-center justify-center">
            <p className="text-sm text-muted flex items-baseline">
              Cargando
              <span className="animate-loading-dot" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-loading-dot" style={{ animationDelay: "200ms" }}>.</span>
              <span className="animate-loading-dot" style={{ animationDelay: "400ms" }}>.</span>
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[10px] text-muted mb-3">
              Todavía no tienes proyectos.
            </p>
            <button
              onClick={() => setProjectModal({ open: true, project: null })}
              className="text-xs px-3 py-1.5 rounded-md bg-ink text-paper"
            >
              Crear tu primer proyecto
            </button>
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[10px] text-muted mb-3">
              Todos tus proyectos están archivados.
            </p>
            <button
              onClick={() => setProjectsPanelOpen(true)}
              className="text-xs px-3 py-1.5 rounded-md bg-ink text-paper"
            >
              Ver proyectos
            </button>
          </div>
        ) : (
          <>
            {view === "dashboard" && (
              <DashboardView
                tasks={filteredTasks}
                projects={
                  projectFilter === "all"
                    ? activeProjects
                    : activeProjects.filter((p) => p.id === projectFilter)
                }
                onSelectTask={(t) => setTaskModal({ open: true, task: t })}
                onOpenProjects={() => setProjectsPanelOpen(true)}
                currentUserName={currentUser?.name}
                onLogout={handleLogout}
              />
            )}
            {view === "gantt" && (
              <GanttView
                tasks={filteredTasks}
                projects={projects}
                onSelectTask={(t) => setTaskModal({ open: true, task: t })}
                onSelectProject={(p) => setProjectModal({ open: true, project: p })}
              />
            )}
            {view === "list" && (
              <ListView
                tasks={filteredTasks}
                projects={projects}
                onSelectTask={(t) => setTaskModal({ open: true, task: t })}
              />
            )}
            {view === "kanban" && (
              <KanbanView
                tasks={filteredTasks}
                projects={projects}
                onSelectTask={(t) => setTaskModal({ open: true, task: t })}
                onChangeStatus={changeTaskStatus}
              />
            )}
            {view === "calendar" && (
              <CalendarView
                tasks={filteredTasks}
                projects={projects}
                onSelectTask={(t) => setTaskModal({ open: true, task: t })}
                onCreateTask={(date) =>
                  setTaskModal({ open: true, task: null, defaultStartDate: toISODate(date) })
                }
              />
            )}
          </>
        )}
      </main>

      {projectModal.open && (
        <ProjectModal
          project={projectModal.project}
          onClose={() => setProjectModal({ open: false })}
          onSave={saveProject}
          onDelete={deleteProject}
        />
      )}
      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          projects={activeProjects}
          users={users}
          defaultProjectId={projectFilter !== "all" ? projectFilter : undefined}
          defaultStartDate={taskModal.defaultStartDate}
          onClose={() => setTaskModal({ open: false })}
          onSave={saveTask}
          onDelete={deleteTask}
          onAttachmentsChanged={load}
        />
      )}
      {projectsPanelOpen && (
        <ProjectsPanel
          projects={projects}
          onClose={() => setProjectsPanelOpen(false)}
          onToggleArchived={toggleArchived}
          onEditProject={(p) => {
            setProjectsPanelOpen(false);
            setProjectModal({ open: true, project: p });
          }}
        />
      )}
      {teamPanelOpen && (
        <TeamPanel
          users={users}
          currentUserId={currentUser?.id}
          onClose={() => setTeamPanelOpen(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}
