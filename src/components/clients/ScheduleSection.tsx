"use client";

import { useEffect, useMemo, useState } from "react";
import { Prospect, Quote } from "@/lib/quotes";
import { addDays, formatShort, localToday, startOfWeek, toISODate } from "@/lib/date";
import { parseWeeks, phasesForOption, planPhases } from "@/lib/schedule";
import { Button } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

interface ProjectOption {
  id: string;
  name: string;
  archived: boolean;
}

// Proyecto ganado → sus fases al calendario, una tras otra y sin asignar
export default function ScheduleSection({
  prospect,
  notify,
  onScheduled,
  onOpenPortal,
}: {
  prospect: Prospect;
  notify: Notify;
  onScheduled: (p: Prospect) => void;
  onOpenPortal?: (projectId: string) => void;
}) {
  const quotes = prospect.quotes ?? [];
  const source = quotes.find((q) => q.status === "approved") ?? quotes[0] ?? null;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  // Por defecto, el lunes que viene
  const [start, setStart] = useState(() => toISODate(addDays(startOfWeek(localToday()), 7)));
  const [weeks, setWeeks] = useState<Record<string, number>>({});
  const [skip, setSkip] = useState<Record<string, boolean>>({});
  const [projectId, setProjectId] = useState<string>(prospect.projectId ?? "");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!prospect.scheduledAt);

  useEffect(() => {
    if (!source) return;
    fetch(`/api/quotes/${source.id}`)
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => {});
  }, [source?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((list: ProjectOption[]) => setProjects(list.filter((p) => !p.archived || p.id === prospect.projectId)))
      .catch(() => {});
  }, [prospect.projectId]);

  useEffect(() => setProjectId(prospect.projectId ?? ""), [prospect.projectId]);

  const phases = useMemo(() => (quote ? phasesForOption(quote.content, quote.approvedOption) : []), [quote]);
  const chosen = phases.filter((ph) => !skip[ph.number]);
  const plan = useMemo(
    () =>
      planPhases(
        chosen,
        chosen.map((ph) => weeks[ph.number] ?? parseWeeks(ph.duration)),
        new Date(`${start}T00:00:00Z`)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phases, skip, weeks, start]
  );
  const byNumber = new Map(plan.map((p) => [p.phase.number, p]));

  if (!source) {
    return (
      <Shell>
        <p className="text-sm text-muted">Crea una cotización con fases para poder calendarizar el proyecto.</p>
      </Shell>
    );
  }

  async function schedule() {
    if (prospect.scheduledAt && !window.confirm("Este proyecto ya se calendarizó. ¿Agregar las fases otra vez?")) return;
    setBusy(true);
    const res = await fetch(`/api/prospects/${prospect.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteId: source!.id,
        startDate: start,
        projectId: projectId || null,
        phases: chosen.map((ph) => ph.number),
        weeks: Object.fromEntries(chosen.map((ph) => [ph.number, weeks[ph.number] ?? parseWeeks(ph.duration)])),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return notify(body?.error ?? "No se pudo calendarizar.", "error");
    }
    const out = await res.json();
    notify(`${out.tasks} fase${out.tasks === 1 ? "" : "s"} en el calendario, sin asignar`);
    setOpen(false);
    onScheduled(out.prospect);
  }

  const range = plan.length > 0 ? `${formatShort(plan[0].start)} – ${formatShort(plan[plan.length - 1].end)}` : "";
  const totalWeeks = plan.reduce((n, p) => n + p.weeks, 0);

  return (
    <Shell
      action={
        prospect.scheduledAt && !open ? (
          <Button tone="ghost" onClick={() => setOpen(true)}>
            Volver a calendarizar
          </Button>
        ) : null
      }
    >
      {prospect.scheduledAt && (
        <p className="text-sm">
          ✓ Calendarizado el {new Date(prospect.scheduledAt).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
          {projects.find((p) => p.id === prospect.projectId) && (
            <span className="text-muted"> en {projects.find((p) => p.id === prospect.projectId)!.name}</span>
          )}
          . Asigna las fases desde el calendario o la lista.
        </p>
      )}
      {prospect.scheduledAt && prospect.projectId && onOpenPortal && !open && (
        <Button onClick={() => onOpenPortal(prospect.projectId!)}>Portal del cliente: avance y pagos →</Button>
      )}

      {open && (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Cada fase de la {source.status === "approved" ? `propuesta aprobada${quote?.approvedOption ? ` (opción ${quote.approvedOption})` : ""}` : "última cotización"}{" "}
            se vuelve una tarea sin asignar, una tras otra de lunes a viernes y sin días festivos. Ajusta las semanas si hace falta.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Arranca</span>
              <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} className="field w-full rounded-xl px-3 py-2 text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Proyecto</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field w-full rounded-xl px-3 py-2 text-sm">
                <option value="">Nuevo: {prospect.brandName}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!quote ? (
            <p className="text-sm text-muted">Cargando fases…</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl bg-ink/[0.04]">
              {phases.map((ph) => {
                const p = byNumber.get(ph.number);
                const off = !!skip[ph.number];
                return (
                  <li key={ph.number} className={`flex items-center gap-3 px-4 py-3 ${off ? "opacity-45" : ""}`}>
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={(e) => setSkip((s) => ({ ...s, [ph.number]: !e.target.checked }))}
                      aria-label={`Incluir fase ${ph.number}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        <span className="text-muted">Fase {ph.number} · </span>
                        {ph.name}
                      </p>
                      <p className="text-xs text-muted">{p ? `${formatShort(p.start)} – ${formatShort(p.end)}` : "No se agrega"}</p>
                      {p && p.holidays.length > 0 && (
                        <p className="text-[11px] text-muted">
                          Sin contar: {p.holidays.map((h) => `${formatShort(h.date)} (${h.name})`).join(", ")}
                        </p>
                      )}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={52}
                        disabled={off}
                        value={weeks[ph.number] ?? parseWeeks(ph.duration)}
                        onChange={(e) => setWeeks((w) => ({ ...w, [ph.number]: Math.max(1, Number(e.target.value) || 1) }))}
                        className="field w-14 rounded-lg px-2 py-1 text-sm text-ink"
                      />
                      sem
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{plan.length > 0 && `${totalWeeks} semanas · ${range}`}</p>
            <div className="flex gap-2">
              {prospect.scheduledAt && (
                <Button tone="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              )}
              <Button tone="primary" onClick={schedule} disabled={busy || !quote || plan.length === 0}>
                {busy ? "Agregando…" : `Agregar ${plan.length} fase${plan.length === 1 ? "" : "s"} al calendario`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-lg">Calendario del proyecto</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
