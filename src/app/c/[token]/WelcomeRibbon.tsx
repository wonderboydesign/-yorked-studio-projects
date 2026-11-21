"use client";

import { useEffect, useState } from "react";

// Cintillo de bienvenida: sale la primera vez que el cliente abre su portal en
// ese navegador (y siempre en la vista previa del estudio). Se cierra con la ×.
export default function WelcomeRibbon({ token, name, thanks, preview }: { token: string; name: string; thanks: boolean; preview: boolean }) {
  const [show, setShow] = useState(false);
  const key = `portal-welcome:${token}`;

  useEffect(() => {
    try {
      if (preview || !localStorage.getItem(key)) {
        setShow(true);
        // Ya se mostró: las próximas visitas no lo repiten
        if (!preview) localStorage.setItem(key, "1");
      }
    } catch {
      // Sin almacenamiento (modo privado): se muestra esta vez
      setShow(true);
    }
  }, [key, preview]);

  if (!show) return null;
  return (
    <div
      role="status"
      className="welcome-ribbon relative flex items-center justify-center gap-3 px-10 py-2.5 text-center text-[14px] leading-snug"
      style={{ background: "var(--accent)", color: "var(--accent-text)" }}
    >
      <span>
        <strong className="font-medium">Te damos la bienvenida a tu proyecto{name ? `, ${name}` : ""}.</strong>
        {thanks && " Gracias por aprobar tu propuesta."}
      </span>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Cerrar bienvenida"
        className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[18px] leading-none opacity-80 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
