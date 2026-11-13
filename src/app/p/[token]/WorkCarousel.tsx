"use client";

import { useEffect, useRef, useState } from "react";

// Fotos de un trabajo en la propuesta: se pasan con el dedo, con las flechas
// (al pasar el mouse) o con los puntos, y avanzan solas mientras el cuadro
// está en pantalla (salvo que la persona prefiera menos movimiento)
export default function WorkCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  useEffect(() => {
    const el = root.current;
    if (!el || count < 2) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused || !visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), 3800);
    return () => clearTimeout(t);
  }, [index, count, paused, visible]);

  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <div
      ref={root}
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={count > 1 ? `${alt} — imagen ${i + 1} de ${count}` : alt}
          loading="lazy"
          draggable={false}
          aria-hidden={i !== index}
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.03] ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/30" />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Imagen anterior"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/55 group-hover:opacity-100 sm:flex"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/55 group-hover:opacity-100 sm:flex"
          >
            →
          </button>
          <div className="absolute right-5 top-5 z-10 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ver imagen ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
