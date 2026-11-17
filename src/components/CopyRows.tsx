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
        <div key={k} className="flex items-center justify-between gap-3 border-t border-black/10 py-2">
          <span className="text-[14px] text-black/55">{k}</span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-right text-[14px] font-medium">{v}</span>
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
          </span>
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
