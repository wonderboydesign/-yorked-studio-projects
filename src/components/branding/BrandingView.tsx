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
import { ArrowUpRight, HeroTitle, OverHero, appear, heroSize } from "../Glass";

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
    <div className="space-y-16 pb-8">
      <HeroTitle
        eyebrow="Proceso de marca"
        aside={<Button onClick={onOpenLibrary}>Biblioteca de referencias</Button>}
        size={heroSize("Branding")}
      >
        Branding
      </HeroTitle>

      <OverHero size={heroSize("Branding")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => {
          const a = appear(i);
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={a.style}
              className={`group text-left glass glass-hover rounded-3xl p-8 min-h-[240px] flex flex-col ${a.className}`}
            >
              <div className="mt-auto flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-xl truncate flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                    {p.name}
                  </h3>
                  {p.client && <p className="text-sm text-muted mt-1 truncate">{p.client}</p>}
                </div>
                <ArrowUpRight className="shrink-0 mb-1" />
              </div>
            </button>
          );
        })}
      </OverHero>

      <div>
        <h2 className="text-2xl mb-1">Cómo trabajamos</h2>
        <p className="text-base text-muted mb-6 max-w-xl">
          Seis etapas. Cada una tiene un objetivo y una salida; la siguiente parte de lo que dejó la anterior.
        </p>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {BRAND_STAGES.map((s, i) => {
            const a = appear(i + projects.length);
            return (
              <li key={s.key} style={a.style} className={`glass rounded-3xl p-6 flex flex-col min-h-[240px] ${a.className}`}>
                <span className="text-sm text-muted">{s.number}</span>
                <div className="mt-auto pt-8">
                  <h3 className="text-xl">{s.label}</h3>
                  <p className="text-sm text-muted mt-2">{s.goal}</p>
                  <p className="text-xs mt-3 pt-3 border-t border-ink/[0.07]">
                    <span className="text-muted">Sale: </span>
                    {s.output}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
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
      <HeroTitle
        eyebrow={project.client ?? "Branding"}
        aside={<Button onClick={onOpenLibrary}>Biblioteca de referencias</Button>}
        size={heroSize(project.name)}
      >
        {project.name}
      </HeroTitle>

      <OverHero size={heroSize(project.name)} className="glass rounded-3xl p-1.5 hero-pad">
      <nav className="grid grid-cols-3 sm:grid-cols-6 gap-1">
        {BRAND_STAGES.map((s) => {
          const active = s.key === view;
          const isCurrent = s.key === data.workspace.stage;
          return (
            <button
              key={s.key}
              onClick={() => setView(s.key)}
              className={`text-left min-w-0 rounded-[26px] px-3 sm:px-4 py-3 transition-colors ${
                active ? "bg-ink text-paper" : "hover:bg-ink/5"
              }`}
            >
              <span className={`font-mono text-xs ${active ? "text-paper/60" : "text-muted"}`}>
                {s.number}
                {progress[s.key] && <span className={active ? "text-paper" : "text-accent"}> ✓</span>}
              </span>
              <span className="block text-sm sm:text-base truncate">
                {s.label}
                {isCurrent && <span className={`ml-1 ${active ? "text-paper" : "text-accent"}`}>●</span>}
              </span>
            </button>
          );
        })}
      </nav>
      </OverHero>

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
