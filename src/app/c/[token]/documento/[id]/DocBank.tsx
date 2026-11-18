"use client";

import { useState } from "react";

// Datos para transferencia dentro del documento: un renglón por dato, con
// botón de copiar (que no se imprime). Cuenta, CLABE y tarjeta se copian solo
// con números.
export default function DocBank({ rows }: { rows: [string, string][] }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(k: string, v: string) {
    const text = /cuenta|clabe|tarjeta/i.test(k) ? v.replace(/\D/g, "") : v;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copia este dato:", text);
    }
    setCopied(k);
    setTimeout(() => setCopied((c) => (c === k ? null : c)), 1800);
  }
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3 border-t border-black/10 py-2.5 print:py-1.5 first:border-t-0">
          <span className="text-[13px] opacity-50">{k}</span>
          <span className="break-all text-[15px]">{v}</span>
          <button
            type="button"
            onClick={() => copy(k, v)}
            aria-label={`Copiar ${k}`}
            className={`rounded-full px-2.5 py-1 text-[11px] print:hidden ${copied === k ? "bg-[#111] text-white" : "bg-black/[0.07] hover:bg-black/10"}`}
          >
            {copied === k ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      ))}
    </div>
  );
}
