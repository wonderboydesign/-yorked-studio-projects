"use client";

import { useEffect, useState } from "react";

// Menú de secciones del portal: en computadora va en la barra; en celular,
// como fila deslizable debajo. Resalta la sección que el cliente está viendo.
export default function PortalNav({ items, variant }: { items: { id: string; label: string }[]; variant: "desktop" | "mobile" }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  // En celular, la sección activa se mantiene a la vista dentro de la fila
  useEffect(() => {
    if (variant !== "mobile" || !active) return;
    document.getElementById(`nav-${active}`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active, variant]);

  if (variant === "desktop") {
    return (
      <nav className="hidden gap-6 text-[13px] md:flex">
        {items.map((i) => (
          <a key={i.id} href={`#${i.id}`} className={active === i.id ? "text-black" : "text-black/50 hover:text-black"}>
            {active === i.id && <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-black align-middle" />}
            {i.label}
          </a>
        ))}
      </nav>
    );
  }
  return (
    <nav className="flex gap-1.5 overflow-x-auto px-5 pb-2.5 text-[13px] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
      {items.map((i) => (
        <a
          key={i.id}
          id={`nav-${i.id}`}
          href={`#${i.id}`}
          className={`shrink-0 rounded-full px-3 py-1.5 ${active === i.id ? "bg-black text-[#f1efe9]" : "bg-black/[0.06] text-black/70"}`}
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}
