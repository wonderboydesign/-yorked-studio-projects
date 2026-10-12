"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrandData, BrandSlide, BrandSlideType, Presentation, isImage, newSlideId } from "@/lib/branding";
import { Project } from "@/lib/types";
import { useBrand } from "./BrandContext";
import SlideView from "./SlideView";
import { Button, DeleteButton, InlineInput, Panel, SectionTitle } from "./ui";

const SLIDE_TYPES: { key: BrandSlideType; label: string }[] = [
  { key: "cover", label: "Portada" },
  { key: "section", label: "Separador" },
  { key: "text", label: "Texto" },
  { key: "concept", label: "Concepto" },
  { key: "moodboard", label: "Moodboard" },
  { key: "image", label: "Piezas" },
];

// Borrador armado con lo que ya existe en las etapas anteriores
export function buildDraft(data: BrandData, project: Project): BrandSlide[] {
  const concepts = data.items.filter((i) => i.kind === "concept");
  const chosen = concepts.filter((c) => c.status === "chosen");
  const conceptList = chosen.length > 0 ? chosen : concepts.filter((c) => c.status !== "discarded");
  const pieces = data.items.filter(
    (i) => i.section === "development" && (i.status === "present" || i.status === "final")
  );
  const brief = data.workspace.brief?.trim() ?? "";

  const slides: BrandSlide[] = [{ id: newSlideId(), type: "cover", title: project.name, body: project.client ?? "" }];
  if (brief) {
    slides.push({
      id: newSlideId(),
      type: "text",
      title: "Lo que entendimos",
      body: brief.length > 900 ? `${brief.slice(0, 900).trim()}…` : brief,
    });
  }
  if (conceptList.length > 0) {
    slides.push({ id: newSlideId(), type: "section", title: "Conceptos" });
    conceptList.forEach((c) => slides.push({ id: newSlideId(), type: "concept", itemIds: [c.id] }));
  }
  data.moodboards.forEach((b) => slides.push({ id: newSlideId(), type: "moodboard", boardId: b.id }));
  if (pieces.length > 0) {
    slides.push({ id: newSlideId(), type: "section", title: "Propuesta" });
    pieces.forEach((p) => slides.push({ id: newSlideId(), type: "image", title: p.title ?? "", itemIds: [p.id] }));
  }
  slides.push({ id: newSlideId(), type: "section", title: "Gracias", body: "Yorked Studio" });
  return slides;
}

export default function PresentationStage() {
  const { data, project, addPresentation, updatePresentation, deletePresentation } = useBrand();
  const [activeId, setActiveId] = useState<string | null>(data.presentations[0]?.id ?? null);
  const presentation = data.presentations.find((p) => p.id === activeId) ?? null;

  useEffect(() => {
    if (!data.presentations.some((p) => p.id === activeId)) setActiveId(data.presentations[0]?.id ?? null);
  }, [data.presentations, activeId]);

  async function create(draft: boolean) {
    const n = data.presentations.length + 1;
    const created = await addPresentation(
      n === 1 ? `${project.name} — Presentación` : `${project.name} — Presentación ${n}`,
      draft ? buildDraft(data, project) : [{ id: newSlideId(), type: "cover", title: project.name, body: project.client ?? "" }]
    );
    if (created) setActiveId(created.id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {data.presentations.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={`text-xs px-3 py-1.5 rounded-full border max-w-[260px] truncate ${
              p.id === activeId ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
            }`}
          >
            {p.title}
          </button>
        ))}
        <Button tone={data.presentations.length === 0 ? "primary" : "default"} onClick={() => create(true)}>
          + Armar borrador con lo del proyecto
        </Button>
        <Button tone="ghost" onClick={() => create(false)}>
          + En blanco
        </Button>
      </div>

      {!presentation ? (
        <Panel className="text-center py-16">
          <p className="text-sm mb-1">Aún no hay presentaciones.</p>
          <p className="text-xs text-muted max-w-md mx-auto">
            “Armar borrador” crea las láminas con el brief, los conceptos elegidos, los moodboards y las piezas
            marcadas “Para presentar”. Después lo ajustas lámina por lámina.
          </p>
        </Panel>
      ) : (
        <Editor
          key={presentation.id}
          presentation={presentation}
          onChange={(fields) => updatePresentation(presentation.id, fields)}
          onDelete={() => deletePresentation(presentation.id)}
        />
      )}
    </div>
  );
}

function Editor({
  presentation,
  onChange,
  onDelete,
}: {
  presentation: Presentation;
  onChange: (fields: Partial<Pick<Presentation, "title" | "slides">>) => void;
  onDelete: () => void;
}) {
  const { data, project } = useBrand();
  const slides = presentation.slides;
  const [index, setIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const current = slides[Math.min(index, slides.length - 1)];

  function setSlides(next: BrandSlide[]) {
    onChange({ slides: next });
  }
  function patchSlide(id: string, fields: Partial<BrandSlide>) {
    setSlides(slides.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    const [s] = next.splice(from, 1);
    next.splice(to, 0, s);
    setSlides(next);
    setIndex(to);
  }
  function addSlide(type: BrandSlideType) {
    const slide: BrandSlide = { id: newSlideId(), type, title: type === "section" ? "Nueva sección" : "" };
    if (type === "moodboard") slide.boardId = data.moodboards[0]?.id;
    const next = [...slides];
    next.splice(index + 1, 0, slide);
    setSlides(next);
    setIndex(index + 1);
  }

  useEffect(() => {
    if (!printing) return;
    // Dejar que el portal se pinte e imágenes empiecen a cargar antes de imprimir
    const t = setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 600);
    return () => clearTimeout(t);
  }, [printing]);

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex-1 min-w-[240px]">
            <InlineInput
              value={presentation.title}
              onSave={(title) => title.trim() && onChange({ title: title.trim() })}
              className="text-xl font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button tone="primary" onClick={() => setPresenting(true)} disabled={slides.length === 0}>
              Presentar
            </Button>
            <Button onClick={() => setPrinting(true)} disabled={slides.length === 0}>
              Exportar PDF
            </Button>
            <DeleteButton label="Eliminar" confirmText={`¿Eliminar "${presentation.title}"?`} onConfirm={onDelete} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
          {/* Secuencia */}
          <ol className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[70vh] pb-2 lg:pb-0 lg:pr-1">
            {slides.map((s, i) => (
              <li key={s.id} className="shrink-0 w-40 lg:w-auto">
                <button
                  onClick={() => setIndex(i)}
                  className={`block w-full rounded-lg overflow-hidden border-2 ${
                    i === index ? "border-accent" : "border-line hover:border-ink/40"
                  }`}
                >
                  <SlideView slide={s} data={data} project={project} className="pointer-events-none" />
                </button>
                <div className="flex items-center justify-between text-[11px] text-muted px-1 mt-0.5">
                  <span>
                    {i + 1}. {SLIDE_TYPES.find((t) => t.key === s.type)?.label}
                  </span>
                  {i === index && (
                    <span className="flex gap-2">
                      <button onClick={() => move(i, i - 1)} title="Subir" className="hover:text-ink">↑</button>
                      <button onClick={() => move(i, i + 1)} title="Bajar" className="hover:text-ink">↓</button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Vista */}
          <div className="min-w-0">
            {current ? (
              <div className="rounded-xl overflow-hidden border border-line shadow-sm">
                <SlideView slide={current} data={data} project={project} />
              </div>
            ) : (
              <p className="text-xs text-muted text-center py-24">Sin láminas. Agrega una a la derecha.</p>
            )}
            <div className="flex flex-wrap items-center gap-1 mt-3">
              <span className="text-[11px] text-muted mr-1">Agregar después de esta:</span>
              {SLIDE_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => addSlide(t.key)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-line text-muted hover:text-ink"
                >
                  + {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Edición de la lámina */}
          {current && (
            <SlideEditor
              key={current.id}
              slide={current}
              data={data}
              onChange={(fields) => patchSlide(current.id, fields)}
              onDelete={() => {
                setSlides(slides.filter((s) => s.id !== current.id));
                setIndex(Math.max(0, index - 1));
              }}
            />
          )}
        </div>
      </Panel>

      {presenting && (
        <Player slides={slides} data={data} project={project} start={index} onClose={() => setPresenting(false)} />
      )}
      {printing &&
        createPortal(
          <div className="print-deck">
            {slides.map((s) => (
              <div key={s.id} className="print-slide">
                <SlideView slide={s} data={data} project={project} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

function SlideEditor({
  slide,
  data,
  onChange,
  onDelete,
}: {
  slide: BrandSlide;
  data: BrandData;
  onChange: (fields: Partial<BrandSlide>) => void;
  onDelete: () => void;
}) {
  const concepts = data.items.filter((i) => i.kind === "concept" && i.status !== "discarded");
  const pickable = data.items.filter(
    (i) => i.url && isImage(i.contentType, i.url) && (i.section === "development" || i.section === "moodboard" || i.section === "concept")
  );
  // Primero lo de desarrollo, que es lo que normalmente se presenta
  pickable.sort((a, b) => Number(b.section === "development") - Number(a.section === "development"));
  const selected = slide.itemIds ?? [];

  function toggleItem(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id].slice(-4);
    onChange({ itemIds: next });
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Lámina" action={<DeleteButton label="Quitar lámina" onConfirm={onDelete} />} />

      <Field label="Tipo">
        <select
          value={slide.type}
          onChange={(e) => onChange({ type: e.target.value as BrandSlideType })}
          className="w-full bg-paper border border-line rounded-full px-3 py-1.5 text-xs"
        >
          {SLIDE_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      {slide.type === "concept" && (
        <Field label="Concepto">
          <select
            value={selected[0] ?? ""}
            onChange={(e) => onChange({ itemIds: e.target.value ? [e.target.value] : [] })}
            className="w-full bg-paper border border-line rounded-full px-3 py-1.5 text-xs"
          >
            <option value="">Elige un concepto</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      {slide.type === "moodboard" && (
        <Field label="Moodboard">
          <select
            value={slide.boardId ?? ""}
            onChange={(e) => onChange({ boardId: e.target.value || undefined })}
            className="w-full bg-paper border border-line rounded-full px-3 py-1.5 text-xs"
          >
            <option value="">Elige un moodboard</option>
            {data.moodboards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label={slide.type === "concept" || slide.type === "moodboard" ? "Título (opcional, reemplaza)" : "Título"}>
        <DraftInput value={slide.title ?? ""} onCommit={(title) => onChange({ title })} />
      </Field>
      <Field label={slide.type === "cover" ? "Subtítulo / cliente" : "Texto"}>
        <DraftInput multiline value={slide.body ?? ""} onCommit={(body) => onChange({ body })} />
      </Field>

      {slide.type === "image" && (
        <Field label={`Piezas (hasta 4) · ${selected.length} elegida(s)`}>
          {pickable.length === 0 ? (
            <p className="text-[11px] text-muted">Sube piezas en Desarrollo.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
              {pickable.map((i) => (
                <button
                  key={i.id}
                  onClick={() => toggleItem(i.id)}
                  title={i.title ?? ""}
                  className={`relative rounded-md overflow-hidden border-2 ${
                    selected.includes(i.id) ? "border-accent" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.url!} alt="" className="w-full aspect-square object-cover" />
                  {selected.includes(i.id) && (
                    <span className="absolute top-1 right-1 text-[10px] bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center">
                      {selected.indexOf(i.id) + 1}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted">{label}</span>
      {children}
    </label>
  );
}

// Guarda al salir del campo para no mandar una petición por tecla
function DraftInput({ value, onCommit, multiline }: { value: string; onCommit: (v: string) => void; multiline?: boolean }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const props = {
    value: text,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
    onBlur: () => text !== value && onCommit(text),
    className: "w-full bg-paper border border-line rounded-2xl px-3 py-2 text-xs focus:outline-none focus:border-ink/40",
  };
  return multiline ? <textarea rows={6} {...props} /> : <input {...props} />;
}

function Player({
  slides,
  data,
  project,
  start,
  onClose,
}: {
  slides: BrandSlide[];
  data: BrandData;
  project: Project;
  start: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.requestFullscreen?.().catch(() => {});
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") setI((n) => Math.min(n + 1, slides.length - 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setI((n) => Math.max(n - 1, 0));
    }
    function onFs() {
      if (!document.fullscreenElement) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose, slides.length]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      onClick={(e) => {
        // Clic en la mitad derecha avanza, en la izquierda regresa
        const half = (e.currentTarget as HTMLElement).clientWidth / 2;
        setI((n) => (e.clientX > half ? Math.min(n + 1, slides.length - 1) : Math.max(n - 1, 0)));
      }}
    >
      <div className="w-full max-w-[calc(100vh*16/9)]">
        <SlideView slide={slides[i]} data={data} project={project} />
      </div>
      <span className="absolute bottom-3 right-4 text-[11px] text-white/50">
        {i + 1} / {slides.length} · Esc para salir
      </span>
    </div>
  );
}
