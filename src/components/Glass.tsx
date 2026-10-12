"use client";

// Piezas del lenguaje visual tomado del template de referencia: título
// gigante que queda detrás de las tarjetas de vidrio (se ve desenfocado a
// través de ellas), flecha ↗ de las tarjetas que abren algo y una fila de
// fichas que se desliza sola.

// Tamaño del título según su largo, para que siempre quepa en una línea
export function heroSize(text: string) {
  const chars = Math.max(text.length, 6);
  return `max(40px, min(184px, 12.5vw, ${(172 / chars).toFixed(2)}vw))`;
}

export function HeroTitle({
  children,
  eyebrow,
  aside,
  size,
}: {
  children: React.ReactNode;
  eyebrow?: React.ReactNode;
  aside?: React.ReactNode;
  size?: string;
}) {
  return (
    <div className="relative z-0 pt-6 sm:pt-10" style={size ? ({ ["--hero-size" as string]: size } as React.CSSProperties) : undefined}>
      {(eyebrow || aside) && (
        <div className="flex items-start justify-between gap-4 mb-2 sm:mb-0">
          <div className="text-base text-ink">{eyebrow}</div>
          {aside && <div className="text-base text-muted text-right">{aside}</div>}
        </div>
      )}
      <h1 className="hero-title text-ink">{children}</h1>
    </div>
  );
}

// Contenedor que sube sobre el título para que el vidrio lo desenfoque
export function OverHero({
  children,
  className = "",
  size,
}: {
  children: React.ReactNode;
  className?: string;
  size?: string;
}) {
  return (
    <div
      className={`relative z-10 hero-overlap ${className}`}
      style={size ? ({ ["--hero-size" as string]: size } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className={`arrow-ur ${className}`}
      aria-hidden="true"
    >
      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" />
    </svg>
  );
}

// Fila de fichas en movimiento continuo, con los bordes desvanecidos.
// Se duplica el contenido para que el ciclo no tenga salto.
export function Marquee({ children, seconds = 28 }: { children: React.ReactNode; seconds?: number }) {
  return (
    <div className="marquee" style={{ ["--marquee-duration" as string]: `${seconds}s` }}>
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

// Retraso escalonado para la animación de entrada de cada tarjeta
export function appear(i: number) {
  return { className: "appear", style: { animationDelay: `${Math.min(i, 10) * 60}ms` } };
}
