"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";

export interface MaterialFile {
  id: string;
  name: string;
  url: string;
  size: number | null;
  createdAt: string;
}

const EXT = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "pdf", "mp4", "mov", "webm", "zip"];
const MAX = 100 * 1024 * 1024;
const mb = (n: number | null) => (n === null ? "" : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const day = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

interface Job {
  key: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
  done?: boolean;
}

// Subida directa de fotos, videos cortos y documentos del cliente. Para videos
// pesados se muestra el link (Dropbox, Drive…) que configuró el estudio.
export default function MaterialUpload({ token, link, initialFiles }: { token: string; link: string | null; initialFiles: MaterialFile[] }) {
  const [files, setFiles] = useState<MaterialFile[]>(initialFiles);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = jobs.some((j) => !j.done && !j.error);

  const patch = (key: string, change: Partial<Job>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...change } : j)));

  async function handle(list: FileList | File[]) {
    const picked = Array.from(list);
    if (picked.length === 0) return;
    const queue = picked.map((f, i) => ({ f, key: `${Date.now()}-${i}-${f.name}` }));
    setJobs((js) => [...js.filter((j) => !j.done), ...queue.map(({ f, key }) => ({ key, name: f.name, size: f.size, progress: 0 }))]);

    const uploaded: { url: string; pathname: string; name: string; contentType: string; size: number }[] = [];
    for (const { f, key } of queue) {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (!ext || !EXT.includes(ext)) {
        patch(key, { error: "Tipo no permitido. Sube fotos, videos MP4/MOV, PDF o ZIP." });
        continue;
      }
      if (f.size > MAX) {
        patch(key, { error: `Pesa más de 100 MB.${link ? " Usa el link de abajo para archivos grandes." : " Escríbenos por WhatsApp."}` });
        continue;
      }
      try {
        const blob = await upload(f.name, f, {
          access: "public",
          handleUploadUrl: `/api/public/portal/${token}/material-upload`,
          multipart: f.size > 20 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => patch(key, { progress: Math.round(percentage) }),
        });
        uploaded.push({ url: blob.url, pathname: blob.pathname, name: f.name, contentType: f.type, size: f.size });
        patch(key, { progress: 100, done: true });
      } catch (e) {
        patch(key, { error: e instanceof Error ? e.message : "No se pudo subir. Intenta de nuevo." });
      }
    }

    if (uploaded.length > 0) {
      const res = await fetch(`/api/public/portal/${token}/material`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: uploaded }),
      });
      if (res.ok) {
        // El servidor devuelve los registros creados: se agregan arriba de la lista
        const docs: MaterialFile[] = await res.json();
        setFiles((cur) => [...docs.map((d) => ({ id: d.id, name: d.name, url: d.url, size: d.size, createdAt: d.createdAt })), ...cur]);
      } else {
        setJobs((js) => js.map((j) => (j.done ? { ...j, done: false, error: "Se subió, pero no se pudo registrar. Avísanos por WhatsApp." } : j)));
      }
    }
  }

  return (
    <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_2fr]">
      <aside className="text-[15px] leading-relaxed text-black/70">
        <p>Sube aquí las fotos, videos y documentos que quieras que usemos. Puedes elegir varios a la vez.</p>
        <p className="mt-3 text-[13px]">Fotos (JPG, PNG, WebP, HEIC), videos MP4 o MOV, PDF y ZIP, hasta 100 MB cada uno.</p>
        {link && (
          <div className="mt-6 border-t border-black pt-4">
            <p className="text-[17px] font-medium leading-snug text-black">¿Videos o archivos más grandes?</p>
            <p className="mt-1 text-[13px]">Súbelos en este link, sin límite de tamaño.</p>
            <a href={link} target="_blank" rel="noreferrer" className="pill-dark mt-4 w-fit">
              Subir archivos grandes <span aria-hidden>↗</span>
            </a>
          </div>
        )}
      </aside>

      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handle(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center border border-dashed px-6 py-12 text-center ${drag ? "border-black bg-black/[0.04]" : "border-black/30"}`}
        >
          <p className="text-[17px] font-medium">Arrastra tus archivos aquí</p>
          <p className="mt-1 text-[13px] text-black/70">o elígelos desde tu dispositivo</p>
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="pill-dark mt-5 disabled:opacity-60">
            {busy ? "Subiendo…" : "Elegir archivos"} <span aria-hidden>↑</span>
          </button>
          <input
            ref={input}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.pdf,.mp4,.mov,.webm,.zip,image/*,video/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handle(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {jobs.length > 0 && (
          <ul className="mt-4 space-y-2" aria-live="polite">
            {jobs.map((j) => (
              <li key={j.key} className="border border-black/15 px-4 py-3 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{j.name}</span>
                  <span className="shrink-0 text-[12px] text-black/70">{j.error ? "No se subió" : j.done ? "✓ Listo" : `${j.progress}%`}</span>
                </div>
                {!j.error && !j.done && (
                  <div className="mt-2 h-1 bg-black/10">
                    <div className="h-full" style={{ width: `${j.progress}%`, background: "var(--accent)" }} />
                  </div>
                )}
                {j.error && <p className="mt-1 text-[13px] text-[#b42318]">{j.error}</p>}
              </li>
            ))}
          </ul>
        )}

        {files.length > 0 && (
          <div className="mt-8">
            <p className="eyebrow mb-3">Lo que ya nos enviaste · {files.length}</p>
            <ul>
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 border-t border-black/10 py-3 text-[14px]">
                  <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline">
                    {f.name}
                  </a>
                  <span className="shrink-0 text-[12px] text-black/70">
                    {mb(f.size)} · {day(f.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
