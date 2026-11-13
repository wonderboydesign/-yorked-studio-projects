"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_WORK_IMAGES, StudioData, StudioWork } from "@/lib/quotes";
import { IMAGE_EXTENSIONS, shrinkImage, uploadFile } from "@/lib/upload";
import { Button } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

// Datos que aparecen en todas las propuestas: contacto, cuenta para el
// anticipo, trabajos relacionados y el tabulador que usa Claude
export default function StudioSettingsPanel({ notify, onClose }: { notify: Notify; onClose: () => void }) {
  const [data, setData] = useState<StudioData | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);

  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then(setData)
      .catch(() => notify("No se pudieron cargar los datos del estudio.", "error"));
  }, [notify]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!data) return;
    setBusy(true);
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (res.ok) {
      notify("Datos del estudio guardados");
      onClose();
    } else notify("No se pudieron guardar.", "error");
  }

  const field = "field w-full rounded-xl px-3 py-2 text-sm";
  const set = (patch: Partial<StudioData>) => setData((d) => (d ? { ...d, ...patch } : d));
  const setBank = (patch: Partial<StudioData["bank"]>) => setData((d) => (d ? { ...d, bank: { ...d.bank, ...patch } } : d));

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-overlay rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-8 pt-6 pb-4">
          <h2 className="text-xl">Datos del estudio</h2>
          <Button tone="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        {!data ? (
          <p className="px-8 pb-8 text-sm text-muted">Cargando…</p>
        ) : (
          <div className="flex-1 overflow-y-auto px-8 pb-6 space-y-8">
            <section className="space-y-3">
              <h3 className="text-base">Datos para el anticipo</h3>
              <p className="text-xs text-muted">
                Se muestran en la propuesta solo después de que el cliente la aprueba, junto con el monto del anticipo.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <L label="Banco"><input value={data.bank.bankName} onChange={(e) => setBank({ bankName: e.target.value })} className={field} /></L>
                <L label="Titular"><input value={data.bank.holder} onChange={(e) => setBank({ holder: e.target.value })} className={field} /></L>
                <L label="Cuenta"><input value={data.bank.account} onChange={(e) => setBank({ account: e.target.value })} className={field} /></L>
                <L label="CLABE"><input value={data.bank.clabe} onChange={(e) => setBank({ clabe: e.target.value })} className={field} /></L>
                <L label="Número de tarjeta (opcional)"><input value={data.bank.card} onChange={(e) => setBank({ card: e.target.value })} className={field} /></L>
                <label className="flex items-center gap-2 text-sm self-end pb-2">
                  <input type="checkbox" checked={data.bank.showCard} onChange={(e) => setBank({ showCard: e.target.checked })} />
                  Mostrar la tarjeta en la propuesta
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-base">Contacto</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <L label="Nombre del estudio"><input value={data.studioName} onChange={(e) => set({ studioName: e.target.value })} className={field} /></L>
                <L label="Marca en la barra"><input value={data.brandMark} onChange={(e) => set({ brandMark: e.target.value })} className={field} /></L>
                <L label="WhatsApp (con lada, solo números)"><input value={data.whatsapp} onChange={(e) => set({ whatsapp: e.target.value.replace(/\D/g, "") })} className={field} /></L>
                <L label="Teléfono como se muestra"><input value={data.phoneLabel} onChange={(e) => set({ phoneLabel: e.target.value })} className={field} /></L>
                <L label="Correos (separados por coma)"><input value={data.emails.join(", ")} onChange={(e) => set({ emails: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className={field} /></L>
                <L label="Instagram (separados por coma)"><input value={data.instagram.join(", ")} onChange={(e) => set({ instagram: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className={field} /></L>
                <L label="Ciudad"><input value={data.city} onChange={(e) => set({ city: e.target.value })} className={field} /></L>
                <L label="Liga del portafolio"><input value={data.portfolioUrl} onChange={(e) => set({ portfolioUrl: e.target.value })} className={field} /></L>
                <L label="Años de práctica"><input type="number" value={data.yearsOfPractice} onChange={(e) => set({ yearsOfPractice: Number(e.target.value) || 0 })} className={field} /></L>
              </div>
            </section>

            <WorksEditor
              works={data.works}
              onChange={(works) => set({ works })}
              notify={notify}
              onUploading={(d) => setUploading((n) => n + d)}
            />

            <section className="space-y-2">
              <h3 className="text-base">Tabulador para Claude</h3>
              <p className="text-xs text-muted">
                Claude parte de esto para sugerir alcance, tiempos y precio. Escríbelo como se lo explicarías a alguien del equipo.
              </p>
              <textarea
                rows={12}
                value={data.pricing}
                onChange={(e) => set({ pricing: e.target.value })}
                className="field w-full rounded-2xl px-3 py-2.5 text-sm resize-y font-mono"
              />
            </section>
          </div>
        )}
        <div className="flex justify-end gap-2 px-8 py-4 border-t border-line">
          <Button tone="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button tone="primary" onClick={save} disabled={!data || busy || uploading > 0}>
            {busy ? "Guardando…" : uploading > 0 ? "Subiendo fotos…" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function newWork(): StudioWork {
  return { id: `w-${Math.random().toString(36).slice(2, 9)}`, name: "", city: "", year: String(new Date().getFullYear()), tone: "#e6e3da" };
}

// Trabajos relacionados: una tarjeta por proyecto, con su render o foto
function WorksEditor({
  works,
  onChange,
  notify,
  onUploading,
}: {
  works: StudioWork[];
  onChange: (works: StudioWork[]) => void;
  notify: Notify;
  onUploading: (delta: number) => void;
}) {
  // Fotos subiéndose por trabajo
  const [busy, setBusy] = useState<Record<string, number>>({});
  // Siempre se edita sobre la lista más reciente (la subida tarda)
  const latest = useRef(works);
  latest.current = works;
  const field = "field w-full rounded-lg px-2.5 py-1.5 text-sm";

  const patch = (id: string, fields: Partial<StudioWork>) => {
    const next = latest.current.map((w) => (w.id === id ? { ...w, ...fields } : w));
    latest.current = next;
    onChange(next);
  };

  function move(i: number, d: number) {
    const next = [...works];
    const [w] = next.splice(i, 1);
    next.splice(i + d, 0, w);
    onChange(next);
  }

  // Cambia las fotos de un trabajo sobre la lista más reciente; la primera
  // queda como portada (image) para las miniaturas
  function setImages(id: string, fn: (images: NonNullable<StudioWork["images"]>) => NonNullable<StudioWork["images"]>) {
    const w = latest.current.find((x) => x.id === id);
    if (!w) return;
    const images = fn(w.images ?? []).slice(0, MAX_WORK_IMAGES);
    patch(id, { images, image: images[0]?.url, imagePath: images[0]?.path });
  }

  // Sube una o varias fotos: llenan los lugares libres, o reemplazan la que
  // se tocó (replaceAt)
  async function upload(id: string, files: File[], replaceAt?: number) {
    const w = latest.current.find((x) => x.id === id);
    const free = MAX_WORK_IMAGES - (w?.images?.length ?? 0);
    const list = replaceAt !== undefined ? files.slice(0, 1) : files.slice(0, free);
    if (files.length > list.length && replaceAt === undefined) {
      notify(`Cada trabajo lleva hasta ${MAX_WORK_IMAGES} fotos; se subieron las primeras.`);
    }
    await Promise.all(
      list.map(async (file) => {
        setBusy((b) => ({ ...b, [id]: (b[id] ?? 0) + 1 }));
        onUploading(1);
        try {
          const up = await uploadFile(await shrinkImage(file), IMAGE_EXTENSIONS);
          const im = { url: up.url, path: up.pathname };
          setImages(id, (images) =>
            replaceAt !== undefined && images[replaceAt] ? images.map((x, j) => (j === replaceAt ? im : x)) : [...images, im]
          );
        } catch (e) {
          notify(e instanceof Error ? e.message : "No se pudo subir la foto.", "error");
        } finally {
          setBusy((b) => ({ ...b, [id]: (b[id] ?? 1) - 1 }));
          onUploading(-1);
        }
      })
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base">Trabajos relacionados</h3>
          <p className="text-xs text-muted mt-1">
            Aparecen en las propuestas. Sube hasta 3 renders o fotos por proyecto (mejor verticales 4:5); en la propuesta se ven en carrusel y la primera es la portada. Se optimizan al subir. En cada
            cotización puedes elegir cuáles mostrar.
          </p>
        </div>
        <Button onClick={() => onChange([...works, newWork()])}>+ Agregar trabajo</Button>
      </div>
      <ul className="space-y-2">
        {works.map((w, i) => (
          <li key={w.id} className="field rounded-2xl p-3 flex gap-3">
            <PhotoStrip
              work={w}
              busy={busy[w.id] ?? 0}
              onFiles={(files, at) => upload(w.id, files, at)}
              onRemove={(at) => setImages(w.id, (images) => images.filter((_, j) => j !== at))}
              onCover={(at) => setImages(w.id, (images) => [images[at], ...images.filter((_, j) => j !== at)])}
            />
            <div className="flex-1 min-w-0 grid gap-2 sm:grid-cols-2 content-start">
              <input value={w.name} onChange={(e) => patch(w.id, { name: e.target.value })} placeholder="Nombre de la marca" className={`${field} font-medium`} />
              <input value={w.kind ?? ""} onChange={(e) => patch(w.id, { kind: e.target.value })} placeholder="Tipo (Identidad de marca)" className={field} />
              <input value={w.city} onChange={(e) => patch(w.id, { city: e.target.value })} placeholder="Ciudad" className={field} />
              <div className="flex gap-2">
                <input value={w.year} onChange={(e) => patch(w.id, { year: e.target.value })} placeholder="Año" className="field rounded-lg px-2.5 py-1.5 text-sm w-20 shrink-0" />
                <label className="flex items-center gap-1.5 text-xs text-muted min-w-0" title="Color de fondo mientras no haya foto">
                  <input type="color" value={w.tone} onChange={(e) => patch(w.id, { tone: e.target.value })} className="h-7 w-9 shrink-0 rounded bg-transparent" />
                  Fondo
                </label>
              </div>
              <input value={w.link ?? ""} onChange={(e) => patch(w.id, { link: e.target.value })} placeholder="Liga al proyecto (opcional, https://…)" className={`${field} sm:col-span-2`} />
            </div>
            <div className="flex flex-col items-end justify-between shrink-0 text-xs">
              <div className="flex gap-1">
                <button disabled={i === 0} onClick={() => move(i, -1)} className="text-muted hover:text-ink disabled:opacity-30 px-1" title="Subir">↑</button>
                <button disabled={i === works.length - 1} onClick={() => move(i, 1)} className="text-muted hover:text-ink disabled:opacity-30 px-1" title="Bajar">↓</button>
              </div>
              <button
                onClick={() => window.confirm(`¿Quitar "${w.name || "este trabajo"}"?`) && onChange(works.filter((x) => x.id !== w.id))}
                className="text-muted hover:text-red-600"
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
        {works.length === 0 && <li className="text-sm text-muted">Sin trabajos. La sección no aparece en las propuestas.</li>}
      </ul>
    </section>
  );
}

function PhotoStrip({
  work,
  busy,
  onFiles,
  onRemove,
  onCover,
}: {
  work: StudioWork;
  busy: number;
  onFiles: (files: File[], replaceAt?: number) => void;
  onRemove: (at: number) => void;
  onCover: (at: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<number | undefined>(undefined);
  const [over, setOver] = useState(false);
  const images = work.images ?? [];
  const slots = Array.from({ length: MAX_WORK_IMAGES }, (_, i) => images[i] ?? null);
  const pick = (at?: number) => {
    target.current = at;
    if (input.current) {
      input.current.multiple = at === undefined;
      input.current.click();
    }
  };

  return (
    <div
      className={`shrink-0 rounded-xl ${over ? "ring-2 ring-ink/40" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
        if (files.length) onFiles(files);
      }}
    >
      <div className="flex gap-1.5">
        {slots.map((im, i) => {
          const loading = !im && i < images.length + busy;
          return im ? (
            <div key={im.url} className="group/photo relative w-[60px] aspect-[4/5] rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => pick(i)}
                title="Cambiar foto"
                className="absolute inset-0 bg-black/45 text-white text-[10px] opacity-0 group-hover/photo:opacity-100 transition-opacity"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => onRemove(i)}
                title="Quitar foto"
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] leading-none opacity-0 group-hover/photo:opacity-100"
              >
                ×
              </button>
              {i === 0 ? (
                <span className="absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 text-[9px] text-white">Portada</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onCover(i)}
                  title="Usar como portada"
                  className="absolute bottom-0.5 left-0.5 rounded-full bg-black/60 px-1.5 text-[9px] text-white opacity-0 group-hover/photo:opacity-100"
                >
                  ★ Portada
                </button>
              )}
            </div>
          ) : (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => pick()}
              disabled={loading}
              title="Subir fotos (puedes elegir varias)"
              className="w-[60px] aspect-[4/5] rounded-lg border border-dashed border-ink/20 hover:border-ink/50 text-[10px] text-muted flex items-center justify-center text-center"
              style={i === 0 ? { background: work.tone } : undefined}
            >
              {loading ? "Subiendo…" : "+ Foto"}
            </button>
          );
        })}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files, target.current);
          e.target.value = "";
        }}
      />
    </div>
  );
}
