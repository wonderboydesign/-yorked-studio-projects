"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Reference } from "@/lib/branding";
import { IMAGE_EXTENSIONS, uploadFile } from "@/lib/upload";
import { Button, DeleteButton, DropZone, InlineInput } from "./ui";

interface LibraryResponse {
  references: Reference[];
  external: Reference[];
  feedConfigured: boolean;
  externalError: string | null;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// Biblioteca de referencias del estudio (compartida entre proyectos) y, si
// está configurado, el dashboard externo. En modo `pick` sirve para elegir
// referencias que quedan ligadas a un moodboard o a la etapa de concepto.
export default function ReferenceLibrary({
  pick,
  onPick,
  onClose,
}: {
  pick?: boolean;
  onPick?: (refs: Reference[]) => void;
  onClose: () => void;
}) {
  const [lib, setLib] = useState<LibraryResponse | null>(null);
  const [tab, setTab] = useState<"library" | "external">("library");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadTags, setUploadTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/references");
    if (res.ok) setLib(await res.json());
    else setError("No se pudo cargar la biblioteca.");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const source = tab === "library" ? lib?.references ?? [] : lib?.external ?? [];
  const allTags = useMemo(
    () => Array.from(new Set(source.flatMap((r) => r.tags))).sort((a, b) => a.localeCompare(b)),
    [source]
  );
  const visible = source.filter((r) => {
    if (tag && !r.tags.includes(tag)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.title, r.notes, r.sourceUrl, ...r.tags].some((v) => v?.toLowerCase().includes(q));
  });

  async function createReference(fields: Partial<Reference> & { url: string }) {
    const res = await fetch("/api/references", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "No se pudo guardar.");
    return (await res.json()) as Reference;
  }

  async function handleFiles(files: FileList) {
    setError("");
    for (const file of Array.from(files)) {
      setBusy((n) => n + 1);
      try {
        const up = await uploadFile(file, IMAGE_EXTENSIONS);
        await createReference({
          url: up.url,
          pathname: up.pathname,
          title: up.filename.replace(/\.[^.]+$/, ""),
          tags: uploadTags.split(","),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al subir.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    await load();
  }

  async function addByUrl(e: React.FormEvent) {
    e.preventDefault();
    const url = imageUrl.trim();
    if (!url) return;
    try {
      await createReference({ url, sourceUrl: url, tags: uploadTags.split(",") });
      setImageUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar.");
    }
  }

  async function updateReference(id: string, fields: Record<string, unknown>) {
    await fetch(`/api/references/${id}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(fields) });
    await load();
  }

  async function deleteReference(id: string) {
    await fetch(`/api/references/${id}`, { method: "DELETE" });
    await load();
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmPick() {
    if (!lib || !onPick) return;
    setBusy((n) => n + 1);
    try {
      // Lo que viene del dashboard externo se guarda primero en la biblioteca,
      // así el moodboard queda ligado a una referencia que no desaparece
      const all = [...lib.references, ...lib.external];
      const picked: Reference[] = [];
      for (const id of Array.from(selected)) {
        const ref = all.find((r) => r.id === id);
        if (!ref) continue;
        picked.push(
          ref.external
            ? await createReference({ url: ref.url, title: ref.title, sourceUrl: ref.sourceUrl, tags: ref.tags, notes: ref.notes })
            : ref
        );
      }
      onPick(picked);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron agregar.");
    } finally {
      setBusy((n) => n - 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-overlay rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 pt-5 pb-4 border-b border-line space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <h2 className="font-mono text-xs">Referencias</h2>
              <nav className="flex gap-4">
                <TabButton active={tab === "library"} onClick={() => setTab("library")}>
                  Biblioteca del estudio ({lib?.references.length ?? 0})
                </TabButton>
                {lib?.feedConfigured && (
                  <TabButton active={tab === "external"} onClick={() => setTab("external")}>
                    Mi dashboard ({lib.external.length})
                  </TabButton>
                )}
              </nav>
            </div>
            <button onClick={onClose} className="text-xs text-muted hover:text-ink">
              Cerrar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, etiqueta o liga…"
              className="flex-1 min-w-[180px] field rounded-full px-3 py-1.5 text-xs focus:outline-none"
            />
            {allTags.slice(0, 14).map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  tag === t ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "library" && (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr] mb-5">
              <DropZone
                compact
                accept="image/*"
                busy={busy > 0}
                label="Sube imágenes a la biblioteca (arrastra o haz clic)"
                onFiles={handleFiles}
              />
              <div className="space-y-2">
                <input
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Etiquetas para lo que subas: tipografía, editorial, packaging…"
                  className="w-full field rounded-full px-3 py-1.5 text-xs focus:outline-none"
                />
                <form onSubmit={addByUrl} className="flex gap-2">
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="…o pega la URL de una imagen"
                    className="flex-1 min-w-0 field rounded-full px-3 py-1.5 text-xs focus:outline-none"
                  />
                  <Button type="submit" disabled={!imageUrl.trim()}>
                    Agregar
                  </Button>
                </form>
              </div>
            </div>
          )}
          {tab === "external" && lib?.externalError && (
            <p className="text-xs text-red-600 mb-3">{lib.externalError}</p>
          )}
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

          {!lib ? (
            <p className="text-xs text-muted py-10 text-center">Cargando…</p>
          ) : visible.length === 0 ? (
            <p className="text-xs text-muted py-10 text-center">
              {source.length === 0
                ? tab === "library"
                  ? "La biblioteca está vacía. Sube tus primeras referencias."
                  : "El dashboard no devolvió referencias."
                : "Nada coincide con la búsqueda."}
            </p>
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
              {visible.map((r) => {
                const isSelected = selected.has(r.id);
                return (
                  <figure
                    key={r.id}
                    className={`mb-3 break-inside-avoid border rounded-2xl overflow-hidden bg-paper ${
                      isSelected ? "border-accent ring-2 ring-accent" : "border-line"
                    } ${pick ? "cursor-pointer" : ""}`}
                    onClick={() => pick && toggle(r.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt={r.title ?? ""} loading="lazy" className="w-full h-auto block" />
                    <figcaption className="p-2 space-y-1" onClick={(e) => !pick && e.stopPropagation()}>
                      {editing === r.id && !r.external ? (
                        <>
                          <InlineInput
                            value={r.title}
                            onSave={(title) => updateReference(r.id, { title })}
                            placeholder="Título"
                            className="text-xs"
                          />
                          <InlineInput
                            value={r.tags.join(", ")}
                            onSave={(tags) => updateReference(r.id, { tags })}
                            placeholder="Etiquetas, separadas por coma"
                            className="text-xs"
                          />
                          <InlineInput
                            value={r.sourceUrl}
                            onSave={(sourceUrl) => updateReference(r.id, { sourceUrl })}
                            placeholder="Liga de origen"
                            className="text-xs"
                          />
                        </>
                      ) : (
                        <>
                          {r.title && <p className="text-xs truncate">{r.title}</p>}
                          {r.tags.length > 0 && (
                            <p className="text-xs text-muted truncate">{r.tags.map((t) => `#${t}`).join(" ")}</p>
                          )}
                        </>
                      )}
                      {!pick && (
                        <div className="flex items-center justify-between pt-1">
                          {r.sourceUrl ? (
                            <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink">
                              Origen
                            </a>
                          ) : (
                            <span />
                          )}
                          {!r.external && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => setEditing(editing === r.id ? null : r.id)}
                                className="text-xs text-muted hover:text-ink"
                              >
                                {editing === r.id ? "Listo" : "Editar"}
                              </button>
                              <DeleteButton
                                onConfirm={() => deleteReference(r.id)}
                                confirmText="¿Eliminar de la biblioteca? Los moodboards que la usan conservan la imagen."
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </div>

        {pick && (
          <footer className="px-6 py-4 border-t border-line flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {selected.size === 0 ? "Elige una o varias referencias" : `${selected.size} seleccionada(s)`}
            </span>
            <Button tone="primary" onClick={confirmPick} disabled={selected.size === 0 || busy > 0}>
              {busy > 0 ? "Agregando…" : "Agregar"}
            </Button>
          </footer>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`text-xs ${active ? "text-ink" : "text-muted hover:text-ink"}`}>
      <span className="text-accent">{active ? "● " : ""}</span>
      {children}
    </button>
  );
}
