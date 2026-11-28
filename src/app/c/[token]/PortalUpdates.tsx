"use client";

import { useEffect, useRef, useState } from "react";

export interface PortalUpdate {
  id: string;
  text: string;
  section: string; // id de la sección a la que lleva
  dateIso: string;
}

const MAX_DAYS = 30;
const DAY = 86400000;
const when = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

// Campana de novedades del portal: avisa lo que se agregó desde la última vez
// que el cliente la abrió (entregas, archivos, reuniones, facturas…). Lo visto
// se guarda en su navegador; la primera vez no se llena de avisos.
export default function PortalUpdates({ token, updates }: { token: string; updates: PortalUpdate[] }) {
  const key = `portal-updates-seen:${token}`;
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSeenAt(Number(raw));
      else {
        // Primera visita: no hay "novedades" que avisar, solo hacia adelante
        const now = Date.now();
        localStorage.setItem(key, String(now));
        setSeenAt(now);
      }
    } catch {
      setSeenAt(0);
    }
  }, [key]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const recent = updates.filter((u) => Date.now() - new Date(u.dateIso).getTime() < MAX_DAYS * DAY);
  const unseen = seenAt === null ? [] : recent.filter((u) => new Date(u.dateIso).getTime() > seenAt);
  if (recent.length === 0) return null;

  function markSeen() {
    // Si el reloj del dispositivo va atrasado respecto al servidor, no se queda la campana encendida
    const newest = updates.reduce((n, u) => Math.max(n, new Date(u.dateIso).getTime()), 0);
    const now = Math.max(Date.now(), newest);
    setSeenAt(now);
    try {
      localStorage.setItem(key, String(now));
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unseen.length ? `Novedades: ${unseen.length} nuevas` : "Novedades"}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center border border-black/15 hover:border-black"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {unseen.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[18px] px-1 text-center text-[11px] leading-[18px]" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {unseen.length > 9 ? "9+" : unseen.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[68px] z-40 max-h-[70vh] overflow-y-auto border border-black bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[360px]">
          <div className="flex items-center justify-between gap-3 border-b border-black/15 px-4 py-3">
            <p className="text-[14px] font-medium">Novedades</p>
            {unseen.length > 0 && (
              <button type="button" onClick={markSeen} className="text-[13px] underline hover:no-underline">
                Marcar como vistas
              </button>
            )}
          </div>
          <ul>
            {recent.slice(0, 10).map((u) => {
              const isNew = unseen.some((x) => x.id === u.id);
              return (
                <li key={u.id} className="border-b border-black/10 last:border-b-0">
                  <a
                    href={`#${u.section}`}
                    onClick={() => {
                      setOpen(false);
                      markSeen();
                    }}
                    className="flex items-start gap-3 px-4 py-3 text-[14px] leading-snug hover:bg-black/[0.04]"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isNew ? "" : "bg-transparent"}`} style={isNew ? { background: "var(--accent)" } : undefined} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block">{u.text}</span>
                      <span className="block text-[12px] text-black/70">{when(u.dateIso)}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
