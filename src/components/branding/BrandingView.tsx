"use client";

import { useEffect, useState } from "react";
import { BRAND_STAGES, BrandData, BrandStage } from "@/lib/branding";
import { Project } from "@/lib/types";
import { BrandProvider, useBrand } from "./BrandContext";
import BriefStage from "./BriefStage";
import ConceptStage from "./ConceptStage";
import ResearchStage from "./ResearchStage";
import MoodboardStage from "./MoodboardStage";
import DevelopmentStage from "./DevelopmentStage";
import PresentationStage from "./PresentationStage";
import ReferenceLibrary from "./ReferenceLibrary";
import { Button } from "./ui";

export default function BrandingView({
  projects,
  projectId,
  onSelectProject,
  notify,
}: {
  projects: Project[];
  projectId: string | null;
  onSelectProject: (id: string) => void;
  notify: (message: string, tone?: "ok" | "error") => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const project = projects.find((p) => p.id === projectId) ?? null;

  return (
    <div className="max-w-[1400px] mx-auto">
      {!project ? (
        <ProjectPicker projects={projects} onSelect={onSelectProject} onOpenLibrary={() => setLibraryOpen(true)} />
      ) : (
        <BrandProvider key={project.id} project={project} notify={notify}>
          <Workspace onOpenLibrary={() => setLibraryOpen(true)} />
        </BrandProvider>
      )}
      {libraryOpen && <ReferenceLibrary onClose={() => setLibraryOpen(false)} />}
    </div>
  );
}

function ProjectPicker({
  projects,
  onSelect,
  onOpenLibrary,
}: {
  projects: Project[];
  onSelect: (id: string) => void;
  onOpenLibrary: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight">Branding</h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            Elige un proyecto para trabajar su proceso de marca, de brief a presentación.
          </p>
        </div>
        <Button onClick={onOpenLibrary}>Biblioteca de referencias</Button>
      </div>

      <ol className="grid gap-px bg-line border border-line rounded-3xl overflow-hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {BRAND_STAGES.map((s) => (
          <li key={s.key} className="bg-surface p-4">
            <span className="font-mono text-xs text-accent">{s.number}</span>
            <h3 className="text-sm font-medium mt-1">{s.label}</h3>
            <p className="text-xs text-muted mt-1">{s.goal}</p>
            <p className="text-[11px] mt-2">
              <span className="text-muted">Sale: </span>
              {s.output}
            </p>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="text-left border border-line bg-surface hover:border-ink/40 rounded-3xl p-5 transition-colors"
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full mb-3" style={{ background: p.color }} />
            <h3 className="text-base font-medium">{p.name}</h3>
            {p.client && <p className="text-xs text-muted">{p.client}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Qué tan avanzada está cada etapa, para el indicador del recorrido
function stageProgress(data: BrandData): Record<BrandStage, boolean> {
  const items = data.items;
  return {
    brief: !!data.workspace.brief?.trim(),
    concept: items.some((i) => i.kind === "concept" && i.status === "chosen"),
    research: !!data.workspace.plan?.trim() || items.some((i) => i.kind === "idea" && i.status === "develop"),
    moodboard: data.moodboards.some((b) => items.some((i) => i.boardId === b.id)),
    development: items.some((i) => i.kind === "piece" && (i.status === "present" || i.status === "final")),
    presentation: data.presentations.some((p) => p.slides.length > 1),
  };
}

function Workspace({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { data, project, patchWorkspace } = useBrand();
  const [view, setView] = useState<BrandStage>(data.workspace.stage);
  const progress = stageProgress(data);
  const index = BRAND_STAGES.findIndex((s) => s.key === view);
  const stage = BRAND_STAGES[index];
  const next = BRAND_STAGES[index + 1];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  function advance() {
    if (!next) return;
    // La etapa "actual" del proyecto es la más avanzada a la que se ha llegado
    const currentIndex = BRAND_STAGES.findIndex((s) => s.key === data.workspace.stage);
    if (index + 1 > currentIndex) patchWorkspace({ stage: next.key });
    setView(next.key);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{project.client ?? "Branding"}</p>
          <h1 className="text-3xl tracking-tight">{project.name}</h1>
        </div>
        <Button onClick={onOpenLibrary}>Biblioteca de referencias</Button>
      </div>

      <nav className="grid grid-cols-3 sm:grid-cols-6 gap-1 border border-line rounded-3xl p-1 bg-surface">
        {BRAND_STAGES.map((s) => {
          const active = s.key === view;
          const isCurrent = s.key === data.workspace.stage;
          return (
            <button
              key={s.key}
              onClick={() => setView(s.key)}
              className={`text-left rounded-[20px] px-3 py-2 transition-colors ${
                active ? "bg-ink text-paper" : "hover:bg-button"
              }`}
            >
              <span className={`font-mono text-[11px] ${active ? "text-paper/60" : "text-muted"}`}>
                {s.number}
                {progress[s.key] && <span className={active ? "text-paper" : "text-accent"}> ✓</span>}
              </span>
              <span className="block text-sm">
                {s.label}
                {isCurrent && <span className={`ml-1 ${active ? "text-paper" : "text-accent"}`}>●</span>}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">
          <span className="text-muted">{stage.number} · </span>
          {stage.goal}
        </p>
        <p className="text-xs text-muted">
          Sale de aquí: <span className="text-ink">{stage.output}</span>
        </p>
      </div>

      {view === "brief" && <BriefStage />}
      {view === "concept" && <ConceptStage />}
      {view === "research" && <ResearchStage />}
      {view === "moodboard" && <MoodboardStage />}
      {view === "development" && <DevelopmentStage />}
      {view === "presentation" && <PresentationStage />}

      {next && (
        <div className="flex justify-end pt-2">
          <Button tone="primary" onClick={advance}>
            Siguiente: {next.number} {next.label} →
          </Button>
        </div>
      )}
    </div>
  );
}
