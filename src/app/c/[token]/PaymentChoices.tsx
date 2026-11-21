"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function send(token: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/public/portal/${token}/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "No se pudo guardar. Intenta de nuevo.");
}

const on = "bg-[#f1efe9] text-[#121210]";
const off = "bg-white/10 text-[#f1efe9] hover:bg-white/15";

// ¿Requieres factura? Sí suma el IVA a los pagos pendientes; No lo quita
export function InvoiceChoice({ token, wants, hasPending }: { token: string; wants: boolean | null; hasPending: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(invoice: boolean) {
    if (busy || wants === invoice) return;
    setError("");
    setBusy(true);
    try {
      await send(token, { invoice });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 border-t border-white/15 pt-6">
      <p className="text-[13px] text-[#f1efe9]/65">¿Requieres factura?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !hasPending} onClick={() => choose(true)} className={`rounded-full px-4 py-2 text-[14px] disabled:opacity-60 ${wants === true ? on : off}`}>
          {wants === true ? "✓ " : ""}Sí, requiero factura (+ IVA 16%)
        </button>
        <button type="button" disabled={busy || !hasPending} onClick={() => choose(false)} className={`rounded-full px-4 py-2 text-[14px] disabled:opacity-60 ${wants === false ? on : off}`}>
          {wants === false ? "✓ " : ""}No requiero factura
        </button>
      </div>
      <p className="mt-3 max-w-xl text-[13px] text-[#f1efe9]/65">
        {wants === true
          ? "Sumamos el IVA a tus pagos pendientes. Sube tu constancia de situación fiscal en la sección de facturas para emitirla."
          : wants === false
          ? "Tus pagos se quedan sin IVA y descargas un recibo de cada uno."
          : "Si la necesitas, al marcar “Sí” se suma el IVA a tus pagos pendientes. Puedes cambiarlo mientras tengas pagos pendientes."}
      </p>
      {error && <p className="mt-2 text-[13px] text-[#ffb4a8]">{error}</p>}
    </div>
  );
}

// Forma de pago de un pago pendiente: transferencia o efectivo
export function MethodChoice({ token, paymentId, method }: { token: string; paymentId: string; method: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(next: "transfer" | "cash") {
    if (busy || method === next) return;
    setError("");
    setBusy(true);
    try {
      await send(token, { paymentId, method: next });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-[#f1efe9]/65">Pago:</span>
        {([
          ["transfer", "Transferencia"],
          ["cash", "Efectivo"],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" disabled={busy} onClick={() => choose(key)} className={`rounded-full px-3 py-1 disabled:opacity-60 ${method === key ? on : off}`}>
            {method === key ? "✓ " : ""}
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-[12px] text-[#ffb4a8]">{error}</p>}
    </div>
  );
}
