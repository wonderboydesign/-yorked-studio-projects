"use client";

import { useEffect, useMemo, useState } from "react";

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  isFile: boolean;
  note: string | null;
  folder: string | null;
  dateIso: string; // fecha de la entrega (para el mes)
  createdIso: string; // cuándo se subió (para saber qué es nuevo)
}

const NEW_DAYS = 14;
const DAY = 86400000;
const IMG = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i;
const monthOf = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "America/Mexico_City" });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

// "Lo nuevo" de un retainer: arriba lo que el cliente aún no ha visto (subido
// en los últimos 14 días), abajo el historial por mes y por carpeta. Lo visto
// se guarda en el navegador del cliente.
export default function RetainerFeed({ token, items, nowIso }: { token: string; items: FeedItem[]; nowIso: string }) {
  const key = `portal-seen:${token}`;
  const [seenAt, setSeenAt] = useState(0);
  const [now, setNow] = useState(() => new Date(nowIso).getTime());
  const [folder, setFolder] = useState<string>("");

  useEffect(() => {
    setNow(Date.now());
    try {
      setSeenAt(Number(localStorage.getItem(key)) || 0);
    } catch {
      /* sin almacenamiento: todo lo reciente cuenta como nuevo */
    }
  }, [key]);

  const isNew = (i: FeedItem) => {
    const t = new Date(i.createdIso).getTime();
    return t > seenAt && now - t < NEW_DAYS * DAY;
  };
  const sorted = useMemo(() => [...items].sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime()), [items]);
  const fresh = sorted.filter(isNew);
  const history = sorted.filter((i) => !isNew(i));
  const folders = Array.from(new Set(items.map((i) => i.folder).filter(Boolean) as string[]));
  const shown = folder ? history.filter((i) => i.folder === folder) : history;

  const months: { label: string; items: FeedItem[] }[] = [];
  for (const i of shown) {
    const label = monthOf(i.dateIso);
    const last = months[months.length - 1];
    if (last && last.label === label) last.items.push(i);
    else months.push({ label, items: [i] });
  }

  function markSeen() {
    const t = Date.now();
    setSeenAt(t);
    try {
      localStorage.setItem(key, String(t));
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      {/* Nuevo para ti */}
      <div className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">
            Nuevo para ti{fresh.length > 0 && <span className="ml-2 rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>{fresh.length}</span>}
          </p>
          {fresh.length > 0 && (
            <button type="button" onClick={markSeen} className="text-[13px] underline hover:no-underline">
              Marcar todo como visto
            </button>
          )}
        </div>
        {fresh.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fresh.map((i) => (
              <Card key={i.id} item={i} isNew />
            ))}
          </div>
        ) : (
          <p className="mt-4 border-t border-black/10 pt-4 text-[15px] text-black/70">Estás al día. Cuando subamos contenido nuevo, aparecerá aquí.</p>
        )}
      </div>

      {/* Entregas anteriores */}
      {history.length > 0 && (
        <div className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black pt-4">
            <p className="eyebrow">Entregas anteriores</p>
            {folders.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[13px]" role="group" aria-label="Filtrar por carpeta">
                {["", ...folders].map((f) => (
                  <button
                    key={f || "todas"}
                    type="button"
                    onClick={() => setFolder(f)}
                    aria-pressed={folder === f}
                    className={`border px-3 py-1 ${folder === f ? "border-black bg-black text-white" : "border-black/25 hover:border-black"}`}
                  >
                    {f || "Todas"}
                  </button>
                ))}
              </div>
            )}
          </div>
          {months.length === 0 && <p className="mt-4 text-[15px] text-black/70">No hay entregas en esta carpeta.</p>}
          {months.map((g) => (
            <div key={g.label} className="mt-8">
              <p className="eyebrow mb-3 capitalize">{g.label}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((i) => (
                  <Card key={i.id} item={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ item: d, isNew }: { item: FeedItem; isNew?: boolean }) {
  const hasLink = !!d.url;
  const isPdf = d.isFile ? /\.pdf(\?|$)/i.test(d.url) || !IMG.test(d.url) : /\.pdf(\?|$)/i.test(d.url);
  const cls = "group flex min-h-[220px] flex-col rounded-[22px] border border-black/10 p-5";
  const body = (
    <>
      {IMG.test(d.url) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.url} alt={d.title} loading="lazy" className="mb-4 h-44 w-full rounded-[14px] bg-black/[0.04] object-cover" />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{d.folder || "Nuevo contenido"}</span>
        {isNew && (
          <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            Nueva
          </span>
        )}
      </div>
      <p className="mt-4 text-[24px] font-medium leading-tight tracking-[-0.02em]">{d.title}</p>
      {d.note && <p className="mt-2 text-[13px] text-black/60">{d.note}</p>}
      <div className="mt-auto flex items-center justify-between pt-6 text-[13px] text-black/55">
        <span>{shortDate(d.dateIso)}</span>
        {hasLink && (
          <span className="pill-dark no-plus">
            {isPdf ? "Abrir PDF" : "Abrir"} <span aria-hidden>↗</span>
          </span>
        )}
      </div>
    </>
  );
  return hasLink ? (
    <a href={d.url} target="_blank" rel="noreferrer" className={`${cls} hover:bg-black/[0.03]`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}
