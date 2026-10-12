"use client";

import { useBrand } from "./BrandContext";
import { AddTextForm, AutoText, DeleteButton, DropZone, Panel, SectionTitle, formatDate } from "./ui";

export default function BriefStage() {
  const { data, patchWorkspace, addItem, deleteItem, uploadItems, uploading } = useBrand();
  const comments = data.items.filter((i) => i.section === "brief" && i.kind === "comment");
  const files = data.items.filter((i) => i.section === "brief" && i.kind === "file");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-5 min-w-0">
        <Panel>
          <SectionTitle
            title="Brief principal"
            hint="Qué pide el cliente, para quién, qué problema resuelve, entregables, tiempos y presupuesto. Es la base de todo lo que sigue."
          />
          <AutoText
            value={data.workspace.brief}
            onSave={(brief) => patchWorkspace({ brief })}
            rows={14}
            placeholder={
              "Ej.\nCliente: …\nQué hacen: …\nObjetivo del proyecto: …\nPúblico: …\nCompetencia: …\nEntregables: …\nTiempos: …"
            }
          />
        </Panel>
        <Panel>
          <SectionTitle
            title="Contexto"
            hint="Lo que no está en el brief pero importa: historia de la marca, mercado, lo que se habló en la junta, restricciones."
          />
          <AutoText
            value={data.workspace.context}
            onSave={(context) => patchWorkspace({ context })}
            rows={8}
            placeholder="Notas de contexto…"
          />
        </Panel>
      </div>

      <div className="space-y-5 min-w-0">
        <Panel>
          <SectionTitle title="Comentarios" hint="Del cliente o del equipo. Quedan con autor y fecha." />
          <AddTextForm
            placeholder="Escribe un comentario… (⌘/Ctrl + Enter para agregar)"
            onAdd={(_title, body) => addItem({ section: "brief", kind: "comment", body })}
          />
          <ul className="mt-4 space-y-3">
            {comments.length === 0 && <li className="text-xs text-muted">Sin comentarios todavía.</li>}
            {[...comments].reverse().map((c) => (
              <li key={c.id} className="border-l-2 border-line pl-3">
                <p className="text-sm whitespace-pre-wrap break-words">{c.body}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted">
                    {c.author?.name ?? "Alguien"} · {formatDate(c.createdAt)}
                  </span>
                  <DeleteButton onConfirm={() => deleteItem(c.id)} confirmText="¿Eliminar este comentario?" />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionTitle title="Archivos" hint="Brief original, presentaciones del cliente, logotipos actuales…" />
          <DropZone
            compact
            busy={uploading > 0}
            label="Arrastra archivos o haz clic (pdf, doc, pptx, imágenes…)"
            onFiles={(f) => uploadItems(f, { section: "brief", kind: "file" })}
          />
          <ul className="mt-3 space-y-1">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                <a href={f.url ?? "#"} target="_blank" rel="noreferrer" className="truncate hover:underline">
                  {f.title}
                </a>
                <DeleteButton onConfirm={() => deleteItem(f.id)} confirmText={`¿Eliminar "${f.title}"?`} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
