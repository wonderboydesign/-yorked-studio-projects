"use client";

import { useCallback, useEffect, useState } from "react";
import { PROSPECT_STAGES, Prospect, ProspectStage, QUOTE_STATUS_LABELS, QuoteSummary } from "@/lib/quotes";
import { Button } from "../branding/ui";
import { HeroTitle, OverHero, appear, heroSize } from "../Glass";
import ProspectPanel from "./ProspectPanel";
import QuoteEditor from "./QuoteEditor";
import StudioSettingsPanel from "./StudioSettingsPanel";

type Notify = (message: string, tone?: "ok" | "error") => void;

// Embudo comercial: prospecto → cotización → aprobada (ganado)
export default function ClientsView({ notify }: { notify: Notify }) {
  const [prospects, setProspects] = useState<Prospect[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/prospects");
    if (res.ok) setProspects(await res.json());
    else notify("No se pudieron cargar los prospectos.", "error");
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function createProspect(brandName: string) {
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName }),
    });
    if (!res.ok) return notify("No se pudo crear el prospecto.", "error");
    const p: Prospect = await res.json();
    setProspects((list) => [p, ...(list ?? [])]);
    setOpenId(p.id);
  }

  function replace(p: Prospect) {
    setProspects((list) => (list ?? []).map((x) => (x.id === p.id ? p : x)));
  }

  async function moveTo(p: Prospect, stage: ProspectStage) {
    replace({ ...p, stage });
    const res = await fetch(`/api/prospects/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      notify("No se pudo mover el prospecto.", "error");
      load();
    }
  }

  const open = prospects?.find((p) => p.id === openId) ?? null;
  const all = prospects ?? [];
  const won = all.filter((p) => p.stage === "won").length;
  const active = all.filter((p) => p.stage !== "won" && p.stage !== "lost").length;

  return (
    <div className="pb-10">
      <HeroTitle
        eyebrow="Prospectos y cotizaciones"
        aside={
          <span className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setSettingsOpen(true)}>Datos del estudio</Button>
            <Button tone="primary" onClick={() => setCreating(true)}>
              + Prospecto
            </Button>
          </span>
        }
        size={heroSize("Clientes")}
      >
        Clientes
      </HeroTitle>

      <OverHero size={heroSize("Clientes")} className="grid gap-4 lg:grid-cols-5">
        {PROSPECT_STAGES.map((stage, i) => {
          const list = all.filter((p) => p.stage === stage.key);
          const a = appear(i);
          return (
            <section
              key={stage.key}
              style={a.style}
              className={`glass rounded-3xl p-3 min-h-[300px] hero-pad flex flex-col min-w-0 ${a.className}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/prospect");
                const p = all.find((x) => x.id === id);
                if (p && p.stage !== stage.key) moveTo(p, stage.key);
              }}
            >
              <h3 className="flex items-baseline justify-between px-3 pb-3 text-base">
                {stage.label}
                <span className="text-sm text-muted">{list.length}</span>
              </h3>
              <div className="space-y-2 flex-1">
                {list.map((p) => (
                  <ProspectCard key={p.id} prospect={p} onOpen={() => setOpenId(p.id)} />
                ))}
                {prospects && list.length === 0 && (
                  <p className="px-3 text-xs text-muted">{stage.key === "new" ? "Agrega tu primer prospecto." : "—"}</p>
                )}
              </div>
            </section>
          );
        })}
      </OverHero>

      {prospects && (
        <p className="mt-6 text-sm text-muted text-right">
          {active} en curso · {won} ganado{won === 1 ? "" : "s"} · Arrastra las tarjetas para cambiarlas de etapa
        </p>
      )}

      {creating && (
        <NewProspectDialog
          onClose={() => setCreating(false)}
          onCreate={(name) => {
            setCreating(false);
            createProspect(name);
          }}
        />
      )}
      {open && (
        <ProspectPanel
          key={open.id}
          prospect={open}
          notify={notify}
          onChange={replace}
          onDeleted={() => {
            setOpenId(null);
            setProspects((list) => (list ?? []).filter((x) => x.id !== open.id));
          }}
          onClose={() => setOpenId(null)}
          onEditQuote={(id) => setEditingQuoteId(id)}
          onReload={load}
        />
      )}
      {editingQuoteId && (
        <QuoteEditor
          quoteId={editingQuoteId}
          notify={notify}
          onClose={() => {
            setEditingQuoteId(null);
            load();
          }}
        />
      )}
      {settingsOpen && <StudioSettingsPanel notify={notify} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function ProspectCard({ prospect: p, onOpen }: { prospect: Prospect; onOpen: () => void }) {
  const q: QuoteSummary | undefined = p.quotes?.[0];
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/prospect", p.id)}
      onClick={onOpen}
      className="block w-full text-left glass glass-hover rounded-2xl p-3.5 min-w-0"
    >
      <p className="text-sm truncate">{p.brandName}</p>
      {(p.contact || p.category) && (
        <p className="text-xs text-muted truncate">{[p.contact, p.category].filter(Boolean).join(" · ")}</p>
      )}
      {q && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              q.status === "approved" ? "bg-green-600" : q.status === "viewed" ? "bg-amber-500" : "bg-ink/30"
            }`}
          />
          {QUOTE_STATUS_LABELS[q.status]}
          {q.viewCount > 0 && q.status !== "approved" && <span className="text-muted">· {q.viewCount} vista{q.viewCount === 1 ? "" : "s"}</span>}
        </p>
      )}
    </button>
  );
}

function NewProspectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onCreate(name.trim());
        }}
        className="glass-overlay rounded-3xl p-8 w-full max-w-md space-y-4"
      >
        <h2 className="text-xl">Nuevo prospecto</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la marca (ej. Matcha Bar)"
          className="field w-full rounded-xl px-4 py-3 text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" tone="primary" disabled={!name.trim()}>
            Crear
          </Button>
        </div>
      </form>
    </div>
  );
}
