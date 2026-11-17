"use client";

import { useState } from "react";
import { DEFAULT_PHASES } from "@/lib/quotes";
import { parseWeeks, planPhases } from "@/lib/schedule";
import { formatShort } from "@/lib/date";
import { Button } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;
type St = "DONE" | "IN_PROGRESS" | "TODO" | "SKIP";

const LABEL: Record<St, string> = { DONE: "Terminada", IN_PROGRESS: "En curso", TODO: "Por venir", SKIP: "No incluir" };

// Fases para proyectos sin cotización: la plantilla del estudio con fecha de
// inicio, semanas y el estado de cada una (para los que ya van avanzados o
// terminados)
export default function PhaseBuilder({ projectId, notify, onDone }: { projectId: string; notify: Notify; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [weeks, setWeeks] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Record<string, St>>(() => Object.fromEntries(DEFAULT_PHASES.map((p) => [p.number, "DONE"])));
  const [busy, setBusy] = useState(false);

  const included = DEFAULT_PHASES.filter((p) => status[p.number] !== "SKIP");
  const plan = start ? planPhases(included, included.map((p) => weeks[p.number] ?? parseWeeks(p.duration)), new Date(`${start}T00:00:00Z`)) : [];
  const dates = new Map(plan.map((p) => [p.phase.number, `${formatShort(p.start)} – ${formatShort(p.end)}`]));

  async function create() {
    if (!start) return notify("Pon la fecha en que arrancó el proyecto.", "error");
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: start,
        phases: included.map((p) => ({ number: p.number, weeks: weeks[p.number] ?? parseWeeks(p.duration), status: status[p.number] })),
      }),
    });
    setBusy(false);
    if (!res.ok) return notify((await res.json().catch(() => null))?.error ?? "No se pudieron crear las fases.", "error");
    notify("Fases creadas; ya se ven en el portal y en el calendario");
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <div className="rounded-2xl bg-ink/[0.04] p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted max-w-sm">
          Este proyecto no tiene fases. Si no pasó por cotización (o ya iba avanzado), créalas con la plantilla del estudio.
        </p>
        <Button onClick={() => setOpen(true)}>Crear fases</Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-ink/[0.04] p-4 space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-xs text-muted">Arrancó el</span>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="field rounded-lg px-2.5 py-1.5 text-sm" />
      </label>
      <ul className="divide-y divide-line">
        {DEFAULT_PHASES.map((p) => {
          const st = status[p.number];
          return (
            <li key={p.number} className={`flex flex-wrap items-center gap-2 py-2 ${st === "SKIP" ? "opacity-45" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">
                  <span className="text-muted">Fase {p.number} · </span>
                  {p.name}
                </p>
                <p className="text-xs text-muted">{dates.get(p.number) ?? (st === "SKIP" ? "No se agrega" : "Pon la fecha de arranque")}</p>
              </div>
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="number"
                  min={1}
                  max={52}
                  disabled={st === "SKIP"}
                  value={weeks[p.number] ?? parseWeeks(p.duration)}
                  onChange={(e) => setWeeks((w) => ({ ...w, [p.number]: Math.max(1, Number(e.target.value) || 1) }))}
                  className="field w-14 rounded-lg px-2 py-1 text-sm text-ink"
                />
                sem
              </label>
              <select
                value={st}
                onChange={(e) => setStatus((s) => ({ ...s, [p.number]: e.target.value as St }))}
                className="field rounded-lg px-2 py-1 text-xs"
                aria-label={`Estado de la fase ${p.number}`}
              >
                {(Object.keys(LABEL) as St[]).map((k) => (
                  <option key={k} value={k}>
                    {LABEL[k]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        Se crean como tareas sin asignar (lunes a viernes, sin festivos), con la descripción y entregables de cada fase. Puedes
        ajustar fechas o estados después desde el calendario o la lista.
      </p>
      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button tone="primary" onClick={create} disabled={busy || !start || included.length === 0}>
          {busy ? "Creando…" : `Crear ${included.length} fase${included.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
