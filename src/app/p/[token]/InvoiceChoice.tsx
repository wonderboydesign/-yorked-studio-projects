"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// ¿Requieres factura? en la propuesta aprobada: Sí suma el IVA (16%) al anticipo
export default function InvoiceChoice({ token, wants }: { token: string; wants: boolean | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(invoice: boolean) {
    if (busy || wants === invoice) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/public/quotes/${token}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "No se pudo guardar.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const on = "bg-[#f1efe9] text-[#121210]";
  const off = "bg-white/10 text-[#f1efe9] hover:bg-white/15";
  return (
    <div className="mt-8">
      <p className="text-[13px] text-[#f1efe9]/70">¿Requieres factura?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => choose(true)} className={`rounded-full px-4 py-2 text-[14px] disabled:opacity-60 ${wants === true ? on : off}`}>
          {wants === true ? "✓ " : ""}Sí, requiero factura (+ IVA 16%)
        </button>
        <button type="button" disabled={busy} onClick={() => choose(false)} className={`rounded-full px-4 py-2 text-[14px] disabled:opacity-60 ${wants === false ? on : off}`}>
          {wants === false ? "✓ " : ""}No requiero factura
        </button>
      </div>
      <p className="mt-3 max-w-md text-[13px] text-[#f1efe9]/70">
        {wants === true
          ? "Sumamos el IVA a tus pagos. Después podrás subir tu constancia de situación fiscal en tu portal."
          : wants === false
          ? "Tus pagos se quedan sin IVA y recibes un recibo de cada uno."
          : "Elige una opción: si requieres factura, el monto del anticipo se actualiza con el IVA."}
      </p>
      {error && <p className="mt-2 text-[13px] text-[#ffb4a8]">{error}</p>}
    </div>
  );
}
