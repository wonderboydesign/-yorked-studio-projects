"use client";

import { useEffect, useRef, useState } from "react";
import { StudioData, StudioWork } from "@/lib/quotes";
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
  const [busyId, setBusyId] = useState<string | null>(null);
  // Siempre se edita sobre la lista más reciente (la subida tarda)
  const latest = useRef(works);
  latest.current = works;
  const field = "field w-full rounded-lg px-2.5 py-1.5 text-sm";

  const patch = (id: string, fields: Partial<StudioWork>) =>
    onChange(latest.current.map((w) => (w.id === id ? { ...w, ...fields } : w)));

  function move(i: number, d: number) {
    const next = [...works];
    const [w] = next.splice(i, 1);
    next.splice(i + d, 0, w);
    onChange(next);
  }

  async function upload(id: string, file: File) {
    setBusyId(id);
    onUploading(1);
    try {
      const up = await uploadFile(await shrinkImage(file), IMAGE_EXTENSIONS);
      patch(id, { image: up.url, imagePath: up.pathname });
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo subir la foto.", "error");
    } finally {
      setBusyId(null);
      onUploading(-1);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base">Trabajos relacionados</h3>
          <p className="text-xs text-muted mt-1">
            Aparecen en las propuestas. Sube un render o foto por proyecto (mejor vertical 4:5); se optimiza al subir. En cada
            cotización puedes elegir cuáles mostrar.
          </p>
        </div>
        <Button onClick={() => onChange([...works, newWork()])}>+ Agregar trabajo</Button>
      </div>
      <ul className="space-y-2">
        {works.map((w, i) => (
          <li key={w.id} className="field rounded-2xl p-3 flex gap-3">
            <PhotoSlot work={w} busy={busyId === w.id} onFile={(f) => upload(w.id, f)} onRemove={() => patch(w.id, { image: undefined, imagePath: undefined })} />
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

function PhotoSlot({ work, busy, onFile, onRemove }: { work: StudioWork; busy: boolean; onFile: (f: File) => void; onRemove: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="shrink-0 w-[88px] space-y-1">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        title={work.image ? "Cambiar foto" : "Subir foto"}
        className={`relative block w-[88px] aspect-[4/5] rounded-xl overflow-hidden border ${over ? "border-ink" : "border-line"}`}
        style={{ background: work.tone }}
      >
        {work.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center text-[11px] text-center px-1 ${
            work.image && !busy ? "opacity-0 hover:opacity-100 bg-black/45 text-white" : "bg-black/5 text-ink/60"
          }`}
        >
          {busy ? "Subiendo…" : work.image ? "Cambiar" : "+ Foto"}
        </span>
      </button>
      {work.image && !busy && (
        <button type="button" onClick={onRemove} className="block w-full text-center text-[11px] text-muted hover:text-red-600">
          Quitar foto
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
