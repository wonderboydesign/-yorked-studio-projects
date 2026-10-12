"use client";

import { useRef, useState } from "react";
import { BrandItem, CompetitorData, DEFAULT_AXES } from "@/lib/branding";

export interface MapPoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

type Axes = typeof DEFAULT_AXES;

// Puntos del mapa a partir de las fichas de competencia. Los que todavía no
// se han movido van en una fila provisional, igual en la etapa y en la lámina.
export function competitorPoints(competitors: BrandItem[]): MapPoint[] {
  return competitors.map((c, i) => {
    const d = (c.data ?? {}) as CompetitorData;
    return {
      id: c.id,
      label: c.title ?? "Competidor",
      x: d.x ?? 0.2 + (i % 4) * 0.1,
      y: d.y ?? 0.3 + Math.floor(i / 4) * 0.1,
    };
  });
}

// Mapa de dos ejes. x y y van de 0 a 1 (y = 1 es arriba). Si recibe
// onMove, los puntos se pueden arrastrar; el punto "target" es el lugar que
// buscamos para la marca. Se usa igual en la etapa y en las láminas, por eso
// los tamaños de texto vienen de fuera (labelClass).
export default function PositionMap({
  points,
  axes,
  target,
  onMove,
  onMoveTarget,
  labelClass = "text-xs",
  axisClass = "text-xs",
  className = "",
}: {
  points: MapPoint[];
  axes: Axes;
  target?: { x: number; y: number } | null;
  onMove?: (id: string, x: number, y: number) => void;
  onMoveTarget?: (x: number, y: number) => void;
  labelClass?: string;
  axisClass?: string;
  className?: string;
}) {
  const area = useRef<HTMLDivElement>(null);
  // Posición mientras se arrastra, para no guardar en cada movimiento
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const interactive = !!onMove;

  function pos(e: React.PointerEvent) {
    const r = area.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp(1 - (e.clientY - r.top) / r.height) };
  }

  function start(id: string) {
    return (e: React.PointerEvent) => {
      if (!interactive) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({ id, ...pos(e) });
    };
  }

  function move(e: React.PointerEvent) {
    if (drag) setDrag({ ...drag, ...pos(e) });
  }

  function end() {
    if (!drag) return;
    if (drag.id === "__target") onMoveTarget?.(drag.x, drag.y);
    else onMove?.(drag.id, drag.x, drag.y);
    setDrag(null);
  }

  const place = (id: string, x: number, y: number) => (drag?.id === id ? { x: drag.x, y: drag.y } : { x, y });
  const t = target ? place("__target", target.x, target.y) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Etiquetas de los ejes */}
      <span className={`absolute left-1/2 -translate-x-1/2 top-0 text-muted ${axisClass}`}>{axes.yTop}</span>
      <span className={`absolute left-1/2 -translate-x-1/2 bottom-0 text-muted ${axisClass}`}>{axes.yBottom}</span>
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-muted ${axisClass}`}>{axes.xLeft}</span>
      <span className={`absolute right-0 top-1/2 -translate-y-1/2 text-muted text-right ${axisClass}`}>{axes.xRight}</span>

      <div
        ref={area}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute inset-[9%] touch-none"
      >
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ink/15" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-ink/15" />

        {t && (
          <div
            onPointerDown={start("__target")}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[0.3em] ${labelClass} ${
              interactive ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            style={{ left: `${t.x * 100}%`, top: `${(1 - t.y) * 100}%` }}
          >
            <span className="block w-[1.6em] h-[1.6em] rounded-full border-[0.14em] border-dashed border-ink bg-ink/10" />
            <span className="whitespace-nowrap font-medium">Nosotros</span>
          </div>
        )}

        {points.map((p) => {
          const at = place(p.id, p.x, p.y);
          return (
            <div
              key={p.id}
              onPointerDown={start(p.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[0.3em] ${labelClass} ${
                interactive ? "cursor-grab active:cursor-grabbing" : ""
              }`}
              style={{ left: `${at.x * 100}%`, top: `${(1 - at.y) * 100}%` }}
            >
              <span className="block w-[0.9em] h-[0.9em] rounded-full bg-ink" />
              <span className="whitespace-nowrap">{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
