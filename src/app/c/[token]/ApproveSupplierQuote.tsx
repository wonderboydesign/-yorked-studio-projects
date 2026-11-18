"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveSupplierQuote({ token, id, title }: { token: string; id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    if (!window.confirm(`¿Apruebas la cotización "${title}"? Le avisaremos al proveedor para avanzar.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/public/portal/${token}/supplier-quotes/${id}`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("No se pudo aprobar. Intenta de nuevo o escríbenos por WhatsApp.");
  }

  return (
    <div>
      <button type="button" onClick={approve} disabled={busy} className="pill-dark">
        {busy ? "Aprobando…" : "Aprobar cotización"} <span aria-hidden>→</span>
      </button>
      {error && <p className="mt-2 text-[13px] text-[#b42318]">{error}</p>}
    </div>
  );
}
