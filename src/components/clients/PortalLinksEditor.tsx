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
  folder: string | null;
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
  const [folder, setFolder] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // Si hay algo en edición, el formulario guarda cambios en lugar de agregar
  const [editing, setEditing] = useState<PortalLinkRow | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setUrl("");
    setDate("");
    setPhase("");
    setFolder("");
    setNote("");
  }

  function startEdit(l: PortalLinkRow) {
    setEditing(l);
    setTitle(l.title);
    setUrl(l.url);
    setNote(l.note ?? "");
    setPhase(l.phase ?? "");
    setFolder(l.folder ?? "");
    setDate(toLocalInput(l.date));
    setTimeout(() => form.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  }

  // Guarda los cambios de lo que ya está publicado. Si se escribe un link
  // nuevo donde había un archivo subido, el archivo anterior se borra.
  async function saveEdit(extra?: { url: string; pathname: string }) {
    if (!editing) return false;
    const newUrl = extra?.url ?? url.trim();
    const body: Record<string, unknown> = {
      title: title.trim() || editing.title,
      url: newUrl,
      note,
      ...(extra ? { pathname: extra.pathname } : newUrl !== editing.url ? { pathname: "" } : {}),
      ...(kind === "delivery" ? { phase, folder } : {}),
      ...(kind === "meeting" && date ? { date: new Date(date).toISOString() } : {}),
    };
    const res = await fetch(`/api/links/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      notify((await res.json().catch(() => null))?.error ?? "No se pudo guardar.", "error");
      return false;
    }
    const updated: PortalLinkRow = await res.json();
    onChange(links.map((x) => (x.id === updated.id ? updated : x)));
    notify("Cambios guardados");
    resetForm();
    return true;
  }

  async function create(fields: { title: string; url: string; pathname?: string }) {
    const res = await fetch(`/api/projects/${projectId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        ...fields,
        note,
        phase: kind === "delivery" ? phase : undefined,
        folder: kind === "delivery" && folder.trim() ? folder.trim() : undefined,
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
    if (editing) await saveEdit();
    else await create({ title: title.trim(), url: url.trim() });
    setBusy(false);
  }

  async function uploadFiles(files: File[]) {
    setBusy(true);
    // Al editar, el archivo nuevo reemplaza al anterior (solo el primero)
    if (editing) {
      try {
        const up = await uploadFile(files[0]);
        await saveEdit({ url: up.url, pathname: up.pathname });
      } catch (e) {
        notify(e instanceof Error ? e.message : `No se pudo subir "${files[0].name}".`, "error");
      }
      setBusy(false);
      return;
    }
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
    if (editing?.id === l.id) resetForm();
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
              <li key={l.id} className={`flex items-center gap-3 py-2.5 ${past ? "opacity-50" : ""} ${editing?.id === l.id ? "bg-ink/[0.05] -mx-4 px-4" : ""}`}>
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
                    {kind === "delivery" && (l.folder ? `${l.folder} · ` : "") + (l.phase ? `Fase ${l.phase} · ` : "") + new Date(l.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    {kind !== "meeting" && (l.pathname ? " · archivo" : l.url ? " · link" : " · sin link")}
                    {l.note && ` · ${l.note}`}
                  </p>
                </div>
                <button onClick={() => startEdit(l)} className="text-xs text-muted hover:text-ink shrink-0">
                  Editar
                </button>
                <button onClick={() => remove(l)} className="text-xs text-muted hover:text-red-600 shrink-0">
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form ref={form} onSubmit={submit} className="field rounded-2xl p-3 space-y-2">
        {editing && (
          <p className="text-xs text-muted">
            Editando “{editing.title}”. {copy.upload ? "Puedes cambiar el link o subir un archivo nuevo que lo reemplaza." : ""}
          </p>
        )}
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
        {kind === "delivery" && (
          <>
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              list={`folders-${projectId}`}
              placeholder="Carpeta (opcional): Reels, Posts, Stories…"
              className="field w-full rounded-lg px-2.5 py-1.5 text-sm"
              aria-label="Carpeta"
            />
            <datalist id={`folders-${projectId}`}>
              {Array.from(new Set(mine.map((l) => l.folder).filter(Boolean) as string[])).map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </>
        )}
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
                multiple={kind === "brand" && !editing}
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
          {editing && (
            <Button tone="ghost" onClick={resetForm} disabled={busy}>
              Cancelar edición
            </Button>
          )}
          <Button type="submit" tone="primary" disabled={busy || !title.trim() || (kind !== "delivery" && !url.trim())}>
            {editing ? "Guardar cambios" : copy.add}
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
