"use client";

import { useEffect, useState } from "react";
import { Reference } from "@/lib/branding";
import { IMAGE_EXTENSIONS } from "@/lib/upload";
import { useBrand } from "./BrandContext";
import ReferenceLibrary from "./ReferenceLibrary";
import { AutoText, Button, DeleteButton, DropZone, InlineInput, Panel, SectionTitle } from "./ui";

export default function MoodboardStage() {
  const { data, addBoard, updateBoard, deleteBoard, addItem, updateItem, deleteItem, uploadItems, uploading } =
    useBrand();
  const boards = data.moodboards;
  const [activeId, setActiveId] = useState<string | null>(boards[0]?.id ?? null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [cols, setCols] = useState(4);
  const chosen = data.items.filter((i) => i.kind === "concept" && i.status === "chosen");

  useEffect(() => {
    if (!boards.some((b) => b.id === activeId)) setActiveId(boards[0]?.id ?? null);
  }, [boards, activeId]);

  const board = boards.find((b) => b.id === activeId) ?? null;
  const images = data.items.filter((i) => i.section === "moodboard" && i.boardId === activeId);

  async function createBoard(name: string) {
    const created = await addBoard(name);
    if (created) setActiveId(created.id);
  }

  async function pickFromLibrary(refs: Reference[]) {
    if (!board) return;
    for (const r of refs) {
      await addItem({ section: "moodboard", kind: "image", boardId: board.id, referenceId: r.id });
    }
  }

  async function addByUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!board || !imageUrl.trim()) return;
    await addItem({ section: "moodboard", kind: "image", boardId: board.id, url: imageUrl.trim(), linkUrl: imageUrl.trim() });
    setImageUrl("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {boards.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveId(b.id)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              b.id === activeId ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
            }`}
          >
            {b.name}
          </button>
        ))}
        <Button
          onClick={() => {
            const name = window.prompt("Nombre del moodboard", `Dirección ${boards.length + 1}`);
            if (name?.trim()) createBoard(name.trim());
          }}
        >
          + Moodboard
        </Button>
        {boards.length === 0 &&
          chosen.map((c) => (
            <Button key={c.id} tone="ghost" onClick={() => createBoard(c.title ?? "Concepto")}>
              + Uno para “{c.title}”
            </Button>
          ))}
      </div>

      {!board ? (
        <Panel className="text-center py-16">
          <p className="text-sm mb-1">Todavía no hay moodboards.</p>
          <p className="text-xs text-muted">
            Lo usual es uno por concepto o dirección visual. Crea el primero con “+ Moodboard”.
          </p>
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-[220px]">
              <InlineInput
                value={board.name}
                onSave={(name) => name.trim() && updateBoard(board.id, { name: name.trim() })}
                className="text-xl font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted">Columnas</span>
              {[3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setCols(n)}
                  className={`text-[11px] w-6 h-6 rounded-full border ${
                    cols === n ? "border-ink bg-ink text-paper" : "border-line text-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
              <DeleteButton
                label="Eliminar moodboard"
                confirmText={`¿Eliminar "${board.name}" y sus imágenes?`}
                onConfirm={() => deleteBoard(board.id)}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              {images.length === 0 ? (
                <p className="text-xs text-muted border border-dashed border-line rounded-2xl py-16 text-center">
                  Sube imágenes, pega URLs o trae referencias desde tu biblioteca.
                </p>
              ) : (
                <div style={{ columnCount: cols }} className="gap-3 [column-fill:_balance] max-sm:![column-count:2]">
                  {images.map((img) => (
                    <figure key={img.id} className="group relative mb-3 break-inside-avoid rounded-xl overflow-hidden bg-paper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url ?? ""} alt={img.title ?? ""} loading="lazy" className="w-full h-auto block" />
                      <figcaption className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <InlineInput
                          value={img.body}
                          onSave={(body) => updateItem(img.id, { body })}
                          placeholder="Nota…"
                          className="text-[11px] text-white placeholder:text-white/60"
                        />
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="text-white/70">
                            {img.referenceId ? "● Biblioteca" : ""}
                            {img.linkUrl && (
                              <a href={img.linkUrl} target="_blank" rel="noreferrer" className="ml-2 hover:underline">
                                Origen
                              </a>
                            )}
                          </span>
                          <button onClick={() => deleteItem(img.id)} className="text-white/70 hover:text-white">
                            Quitar
                          </button>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-3">
              <DropZone
                compact
                accept="image/*"
                busy={uploading > 0}
                label="Arrastra imágenes o haz clic"
                onFiles={(f) =>
                  uploadItems(f, { section: "moodboard", kind: "image", boardId: board.id, title: undefined }, IMAGE_EXTENSIONS)
                }
              />
              <Button onClick={() => setLibraryOpen(true)}>Traer de la biblioteca / dashboard</Button>
              <form onSubmit={addByUrl} className="flex gap-2">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL de imagen"
                  className="flex-1 min-w-0 bg-paper border border-line rounded-full px-3 py-1.5 text-xs focus:outline-none"
                />
                <Button type="submit" disabled={!imageUrl.trim()}>
                  +
                </Button>
              </form>
              <div>
                <SectionTitle title="Notas" hint="Qué comunica este moodboard: color, textura, actitud." />
                <AutoText
                  key={board.id}
                  value={board.notes}
                  onSave={(notes) => updateBoard(board.id, { notes })}
                  rows={8}
                  className="text-xs"
                  placeholder="Paleta cálida, contraste alto, tipografía con serifa…"
                />
              </div>
            </aside>
          </div>
        </Panel>
      )}

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
