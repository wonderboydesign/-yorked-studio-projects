"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";
import { Button } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;
export type LinkKind = "delivery" | "meeting" | "brand";

export interface PortalLinkRow {
  id: string;
  kind: LinkKind;
  title: string;
  url: string;
  pathname: string | null;
  note: string | null;
  phase: string | null;
  date: string | null;
  createdAt: string;
}

const COPY: Record<LinkKind, { title: string; hint: string; namePh: string; urlPh: string; add: string; upload?: string; empty: string }> = {
  meeting: {
    title: "Reuniones",
    hint: "Pega el link de Meet, Zoom o Teams con fecha y hora. El cliente ve la próxima arriba con botón para unirse.",
    namePh: "Presentación de rutas visuales",
    urlPh: "https://meet.google.com/…",
    add: "Agregar reunión",
    empty: "Sin reuniones agendadas.",
  },
  delivery: {
    title: "Entregas",
    hint: "Cada presentación o avance que le mandas: sube el PDF (exportado desde Branding → Presentación) o pega un link de Drive, Figma…",
    namePh: "Presentación de concepto",
    urlPh: "Link (opcional) o sube el PDF",
    add: "Agregar entrega",
    upload: "Subir PDF",
    empty: "Aún no hay entregas.",
  },
  brand: {
    title: "Descargables de marca",
    hint: "Los archivos finales: un link a la carpeta de Drive/Dropbox o a su brand portal, o archivos sueltos (logos, manual). Para paquetes pesados, mejor link.",
    namePh: "Kit de marca completo",
    urlPh: "https://drive.google.com/… (o sube el archivo)",
    add: "Agregar descargable",
    upload: "Subir archivo",
    empty: "Sin descargables todavía; aparecen al cliente como botón en su portal.",
  },
};

const pad = (n: number) => String(n).padStart(2, "0");
// Fecha y hora local del navegador para <input type="datetime-local">
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function PortalLinksEditor({
  kind,
  projectId,
  links,
  phases,
  notify,
  onChange,
}: {
  kind: LinkKind;
  projectId: string;
  links: PortalLinkRow[];
  phases: { number: string; name: string }[];
  notify: Notify;
  onChange: (links: PortalLinkRow[]) => void;
}) {
  const copy = COPY[kind];
  const mine = links.filter((l) => l.kind === kind);
  const others = links.filter((l) => l.kind !== kind);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");
  const [phase, setPhase] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function create(fields: { title: string; url: string; pathname?: string }) {
    const res = await fetch(`/api/projects/${projectId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        ...fields,
        note,
        phase: kind === "delivery" ? phase : undefined,
        date: kind === "meeting" && date ? new Date(date).toISOString() : kind === "delivery" ? new Date().toISOString() : undefined,
      }),
    });
    if (!res.ok) {
      notify((await res.json().catch(() => null))?.error ?? "No se pudo agregar.", "error");
      return false;
    }
    const link: PortalLinkRow = await res.json();
    onChange([link, ...others, ...mine]);
    setTitle("");
    setUrl("");
    setDate("");
    setNote("");
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Las entregas pueden ir sin link
    if (!title.trim() || (kind !== "delivery" && !url.trim())) return;
    if (kind === "meeting" && !date) return notify("Pon la fecha y hora de la reunión.", "error");
    setBusy(true);
    await create({ title: title.trim(), url: url.trim() });
    setBusy(false);
  }

  async function uploadFiles(files: File[]) {
    setBusy(true);
    for (const f of files) {
      try {
        const up = await uploadFile(f);
        await create({ title: title.trim() || f.name.replace(/\.[^.]+$/, ""), url: up.url, pathname: up.pathname });
      } catch (e) {
        notify(e instanceof Error ? e.message : `No se pudo subir "${f.name}".`, "error");
      }
    }
    setBusy(false);
  }

  async function remove(l: PortalLinkRow) {
    if (!window.confirm(`¿Quitar "${l.title}" del portal?`)) return;
    onChange(links.filter((x) => x.id !== l.id));
    await fetch(`/api/links/${l.id}`, { method: "DELETE" });
  }

  const sorted =
    kind === "meeting"
      ? [...mine].sort((a, b) => new Date(b.date ?? b.createdAt).getTime() - new Date(a.date ?? a.createdAt).getTime())
      : mine;
  const now = Date.now();

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base">{copy.title}</h3>
        <p className="text-xs text-muted mt-1">{copy.hint}</p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted">{copy.empty}</p>
      ) : (
        <ul className="text-sm divide-y divide-line rounded-2xl bg-ink/[0.04] px-4">
          {sorted.map((l) => {
            const past = kind === "meeting" && l.date && new Date(l.date).getTime() < now - 2 * 3600 * 1000;
            return (
              <li key={l.id} className={`flex items-center gap-3 py-2.5 ${past ? "opacity-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  {l.url ? (
                    <a href={l.url} target="_blank" rel="noreferrer" className="block truncate hover:underline">
                      {l.title}
                    </a>
                  ) : (
                    <span className="block truncate">{l.title}</span>
                  )}
                  <p className="text-xs text-muted truncate">
                    {kind === "meeting" && l.date && when(l.date)}
                    {kind === "delivery" && (l.phase ? `Fase ${l.phase} · ` : "") + new Date(l.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    {kind !== "meeting" && (l.pathname ? " · archivo" : l.url ? " · link" : " · sin link")}
                    {l.note && ` · ${l.note}`}
                  </p>
                </div>
                <button onClick={() => remove(l)} className="text-xs text-muted hover:text-red-600 shrink-0">
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="field rounded-2xl p-3 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.namePh} className="field rounded-lg px-2.5 py-1.5 text-sm" aria-label="Título" />
          {kind === "meeting" ? (
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="field rounded-lg px-2.5 py-1.5 text-sm" aria-label="Fecha y hora" />
          ) : kind === "delivery" ? (
            <select value={phase} onChange={(e) => setPhase(e.target.value)} className="field rounded-lg px-2.5 py-1.5 text-sm" aria-label="Fase">
              <option value="">Sin fase</option>
              {phases.map((p) => (
                <option key={p.number} value={p.number}>
                  Fase {p.number} · {p.name}
                </option>
              ))}
            </select>
          ) : (
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional): versión, formatos…" className="field rounded-lg px-2.5 py-1.5 text-sm" />
          )}
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={copy.urlPh} className="field w-full rounded-lg px-2.5 py-1.5 text-sm" aria-label="Liga" />
        {kind !== "brand" && (
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota para el cliente (opcional)" className="field w-full rounded-lg px-2.5 py-1.5 text-sm" />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {copy.upload && (
            <>
              <Button onClick={() => file.current?.click()} disabled={busy}>
                {busy ? "Subiendo…" : copy.upload}
              </Button>
              <input
                ref={file}
                type="file"
                multiple={kind === "brand"}
                accept={kind === "delivery" ? "application/pdf" : undefined}
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) uploadFiles(files);
                  e.target.value = "";
                }}
              />
            </>
          )}
          <Button type="submit" tone="primary" disabled={busy || !title.trim() || (kind !== "delivery" && !url.trim())}>
            {copy.add}
          </Button>
        </div>
      </form>
      {kind === "meeting" && (
        <p className="text-xs text-muted">
          Tip: con “Programar Meet” (abajo a la izquierda) creas la reunión en Google Calendar y pegas aquí su link.
        </p>
      )}
    </section>
  );
}
