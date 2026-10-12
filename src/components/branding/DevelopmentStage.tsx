"use client";

import { useState } from "react";
import { PIECE_STATUSES } from "@/lib/branding";
import { useBrand } from "./BrandContext";
import { DeleteButton, DropZone, FileThumb, InlineInput, InlineTextarea, Panel, Pills, SectionTitle } from "./ui";

type PieceStatus = (typeof PIECE_STATUSES)[number]["key"];

export default function DevelopmentStage() {
  const { data, updateItem, deleteItem, uploadItems, uploading } = useBrand();
  const [filter, setFilter] = useState<PieceStatus | "all">("all");
  const [uploadStatus, setUploadStatus] = useState<PieceStatus>("sketch");
  const pieces = data.items.filter((i) => i.section === "development" && i.kind === "piece");
  const visible = filter === "all" ? pieces : pieces.filter((p) => p.status === filter);
  const toPresent = pieces.filter((p) => p.status === "present" || p.status === "final").length;

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle
          title="Subir elementos"
          hint="Bocetos, logotipos, aplicaciones, mockups. Marca “Para presentar” lo que debe entrar en la presentación."
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
          <DropZone
            busy={uploading > 0}
            label="Arrastra bocetos y piezas (imágenes, pdf, ai, svg) o haz clic"
            onFiles={(f) => uploadItems(f, { section: "development", kind: "piece", status: uploadStatus })}
          />
          <div className="space-y-1">
            <p className="text-[11px] text-muted">Entran como</p>
            <Pills options={PIECE_STATUSES} value={uploadStatus} onChange={setUploadStatus} />
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            filter === "all" ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
          }`}
        >
          Todo · {pieces.length}
        </button>
        {PIECE_STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filter === s.key ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
            }`}
          >
            {s.label} · {pieces.filter((p) => p.status === s.key).length}
          </button>
        ))}
        <span className="text-xs text-muted ml-auto">{toPresent} pieza(s) lista(s) para presentación</span>
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-muted text-center py-16 border border-dashed border-line rounded-3xl">
          {pieces.length === 0 ? "Aún no hay piezas. Sube el primer boceto." : "No hay piezas en este estado."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <article
              key={p.id}
              className={`border rounded-2xl overflow-hidden bg-surface flex flex-col ${
                p.status === "present" || p.status === "final" ? "border-accent" : "border-line"
              }`}
            >
              <a href={p.url ?? "#"} target="_blank" rel="noreferrer" className="block bg-paper">
                <FileThumb item={p} className="max-h-72 object-contain mx-auto" />
              </a>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <InlineInput
                  value={p.title}
                  onSave={(title) => updateItem(p.id, { title })}
                  placeholder="Nombre de la pieza"
                  className="text-sm font-medium"
                />
                <InlineTextarea
                  value={p.body}
                  onSave={(body) => updateItem(p.id, { body })}
                  placeholder="Notas, cambios pedidos, versión…"
                  className="text-xs text-ink/80"
                />
                <div className="mt-auto pt-2 border-t border-line space-y-2">
                  <Pills
                    options={PIECE_STATUSES}
                    value={(p.status as PieceStatus) ?? "sketch"}
                    onChange={(status) => updateItem(p.id, { status })}
                  />
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>{p.author?.name}</span>
                    <DeleteButton onConfirm={() => deleteItem(p.id)} confirmText={`¿Eliminar "${p.title}"?`} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
