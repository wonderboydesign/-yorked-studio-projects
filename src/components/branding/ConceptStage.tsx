"use client";

import { useState } from "react";
import { CONCEPT_STATUSES, Reference, isImage } from "@/lib/branding";
import { IMAGE_EXTENSIONS } from "@/lib/upload";
import { useBrand } from "./BrandContext";
import ReferenceLibrary from "./ReferenceLibrary";
import {
  AddTextForm,
  AutoText,
  Button,
  DeleteButton,
  DropZone,
  FileThumb,
  InlineInput,
  InlineTextarea,
  Panel,
  Pills,
  SectionTitle,
} from "./ui";

export default function ConceptStage() {
  const { data, patchWorkspace, addItem, updateItem, deleteItem, uploadItems, uploading, generateConcepts } =
    useBrand();
  const references = data.items.filter((i) => i.section === "concept" && i.kind === "reference");
  const concepts = data.items.filter((i) => i.section === "concept" && i.kind === "concept");
  const [linkUrl, setLinkUrl] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [count, setCount] = useState(3);
  const [direction, setDirection] = useState("");
  const [generating, setGenerating] = useState(false);
  const hasBrief = !!data.workspace.brief?.trim();

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;
    await addItem(
      isImage(null, url)
        ? { section: "concept", kind: "reference", url, linkUrl: url }
        : { section: "concept", kind: "reference", linkUrl: url, title: url.replace(/^https?:\/\//, "") }
    );
    setLinkUrl("");
  }

  async function pickFromLibrary(refs: Reference[]) {
    for (const r of refs) {
      await addItem({ section: "concept", kind: "reference", referenceId: r.id });
    }
  }

  async function generate() {
    setGenerating(true);
    const ok = await generateConcepts(count, direction);
    if (ok) setDirection("");
    setGenerating(false);
  }

  const order = { chosen: 0, proposed: 1, discarded: 2 } as Record<string, number>;
  const sortedConcepts = [...concepts].sort(
    (a, b) => (order[a.status ?? "proposed"] ?? 1) - (order[b.status ?? "proposed"] ?? 1) || a.order - b.order
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            title="Detalle de conceptualización"
            hint="Tu lectura del brief: tensiones, oportunidades, palabras que resuenan, qué debe sentir la gente."
          />
          <AutoText
            value={data.workspace.conceptNotes}
            onSave={(conceptNotes) => patchWorkspace({ conceptNotes })}
            rows={10}
            placeholder="Atributos, territorio, insight, lo que no queremos ser…"
          />
        </Panel>

        <Panel>
          <SectionTitle
            title="Referencias"
            hint="Imágenes o ligas que inspiran. Claude también las toma en cuenta al generar conceptos."
            action={<Button onClick={() => setLibraryOpen(true)}>De la biblioteca</Button>}
          />
          <DropZone
            compact
            busy={uploading > 0}
            accept="image/*"
            label="Arrastra imágenes o haz clic"
            onFiles={(f) => uploadItems(f, { section: "concept", kind: "reference" }, IMAGE_EXTENSIONS)}
          />
          <form onSubmit={addLink} className="flex gap-2 mt-2">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Pega una liga (Pinterest, Behance, web…)"
              className="flex-1 min-w-0 field rounded-full px-3 py-1.5 text-xs focus:outline-none"
            />
            <Button type="submit" disabled={!linkUrl.trim()}>
              Agregar
            </Button>
          </form>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {references.map((r) => (
              <div key={r.id} className="group border border-line rounded-2xl overflow-hidden bg-paper">
                {r.url ? (
                  <FileThumb item={r} />
                ) : (
                  <a
                    href={r.linkUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center aspect-[4/3] text-xs text-accent px-3 text-center break-all"
                  >
                    {r.title ?? r.linkUrl}
                  </a>
                )}
                <div className="p-2 space-y-1">
                  <InlineInput
                    value={r.body}
                    onSave={(body) => updateItem(r.id, { body })}
                    placeholder="Qué nos gusta de esta…"
                    className="text-xs"
                  />
                  <div className="flex items-center justify-between">
                    {r.linkUrl ? (
                      <a href={r.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink">
                        Abrir
                      </a>
                    ) : (
                      <span />
                    )}
                    <DeleteButton onConfirm={() => deleteItem(r.id)} label="Quitar" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          title="Conceptos"
          hint="Propón conceptos a mano o pídele a Claude un par a partir del brief. Marca como “Elegido” los que pasan a investigación."
        />

        <div className="border border-line rounded-2xl p-4 bg-paper mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs">Generar con Claude</span>
            <div className="flex items-center gap-1">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`text-xs w-7 h-7 rounded-full border ${
                    count === n ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="Opcional: “más atrevidos”, “que partan del origen del fundador”…"
              className="flex-1 min-w-[200px] field rounded-full px-3 py-1.5 text-xs focus:outline-none"
            />
            <Button tone="primary" onClick={generate} disabled={!hasBrief || generating}>
              {generating ? "Pensando…" : "Generar conceptos"}
            </Button>
          </div>
          {!hasBrief && <p className="text-xs text-muted mt-2">Escribe primero el brief principal (etapa 01).</p>}
          {generating && (
            <p className="text-xs text-muted mt-2">
              Claude está leyendo el brief, el contexto, los comentarios y las referencias. Tarda alrededor de un minuto.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedConcepts.map((c) => (
            <article
              key={c.id}
              className={`border rounded-2xl p-4 flex flex-col gap-3 ${
                c.status === "chosen" ? "border-accent" : "border-line"
              } ${c.status === "discarded" ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <InlineInput
                  value={c.title}
                  onSave={(title) => updateItem(c.id, { title })}
                  placeholder="Nombre del concepto"
                  className="text-base font-medium"
                />
                {c.aiGenerated && (
                  <span className="shrink-0 text-[10px] font-mono text-muted border border-line rounded-full px-2 py-0.5">
                    IA
                  </span>
                )}
              </div>
              <InlineTextarea
                value={c.body}
                onSave={(body) => updateItem(c.id, { body })}
                placeholder="Idea central, por qué funciona, dirección visual, tono…"
                className="text-sm leading-relaxed whitespace-pre-wrap"
              />
              <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-line">
                <Pills
                  options={CONCEPT_STATUSES}
                  value={(c.status as (typeof CONCEPT_STATUSES)[number]["key"]) ?? "proposed"}
                  onChange={(status) => updateItem(c.id, { status })}
                />
                <DeleteButton onConfirm={() => deleteItem(c.id)} confirmText={`¿Eliminar "${c.title}"?`} />
              </div>
            </article>
          ))}
          <AddTextForm
            withTitle
            titlePlaceholder="Nuevo concepto"
            placeholder="Idea central…"
            submitLabel="Agregar concepto"
            onAdd={(title, body) =>
              addItem({ section: "concept", kind: "concept", title, body, status: "proposed" })
            }
          />
        </div>
      </Panel>

      {libraryOpen && (
        <ReferenceLibrary
          pick
          onClose={() => setLibraryOpen(false)}
          onPick={async (refs) => {
            setLibraryOpen(false);
            await pickFromLibrary(refs);
          }}
        />
      )}
    </div>
  );
}
