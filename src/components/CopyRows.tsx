"use client";

import { useState } from "react";

// Datos bancarios con botón para copiar cada uno (y todos juntos), para que
// el cliente los pegue en su app del banco sin errores. Cuenta, CLABE y
// tarjeta se copian solo con números.
export default function CopyRows({ rows }: { rows: [string, string][] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Navegadores sin portapapeles: se selecciona para copiar a mano
      window.prompt("Copia este dato:", text);
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }

  const clean = (k: string, v: string) => (/cuenta|clabe|tarjeta/i.test(k) ? v.replace(/\D/g, "") : v);
  const all = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

  return (
    <div>
      {rows.map(([k, v]) => (
        // Etiqueta y botón arriba, el dato completo abajo: así un titular largo
        // o la CLABE nunca empujan el recuadro fuera de la pantalla
        <div key={k} className="border-t border-black/10 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-black/55">{k}</span>
            <button
              type="button"
              onClick={() => copy(k, clean(k, v))}
              aria-label={`Copiar ${k}`}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                copied === k ? "bg-[#121210] text-[#f1efe9]" : "bg-black/[0.06] text-black/70 hover:bg-black/10"
              }`}
            >
              {copied === k ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-0.5 text-[15px] font-medium leading-snug break-words [overflow-wrap:anywhere]">{v}</p>
        </div>
      ))}
      <button
        type="button"
        onClick={() => copy("__all", all)}
        className="mt-3 w-full rounded-full border border-black/15 py-2 text-[13px] hover:bg-black/[0.04]"
      >
        {copied === "__all" ? "✓ Datos copiados" : "Copiar todos los datos"}
      </button>
    </div>
  );
}
