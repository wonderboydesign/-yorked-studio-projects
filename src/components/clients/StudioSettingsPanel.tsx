"use client";

import { useEffect, useState } from "react";
import { StudioData } from "@/lib/quotes";
import { Button } from "../branding/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

// Datos que aparecen en todas las propuestas: contacto, cuenta para el
// anticipo, trabajos relacionados y el tabulador que usa Claude
export default function StudioSettingsPanel({ notify, onClose }: { notify: Notify; onClose: () => void }) {
  const [data, setData] = useState<StudioData | null>(null);
  const [busy, setBusy] = useState(false);

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
        className="glass-overlay rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col"
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

            <section className="space-y-2">
              <h3 className="text-base">Trabajos relacionados</h3>
              <p className="text-xs text-muted">Uno por línea: Nombre | Ciudad | Año | color de fondo (#hex)</p>
              <textarea
                rows={6}
                value={data.works.map((w) => `${w.name} | ${w.city} | ${w.year} | ${w.tone}`).join("\n")}
                onChange={(e) =>
                  set({
                    works: e.target.value
                      .split("\n")
                      .map((l) => l.split("|").map((s) => s.trim()))
                      .filter((p) => p[0])
                      .map(([name, city = "", year = "", tone = "#e6e3da"]) => ({ name, city, year, tone })),
                  })
                }
                className="field w-full rounded-2xl px-3 py-2.5 text-sm resize-y"
              />
            </section>

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
          <Button tone="primary" onClick={save} disabled={!data || busy}>
            {busy ? "Guardando…" : "Guardar"}
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
