"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";

// Botón para que el cliente suba el comprobante de su anticipo (PDF o imagen)
export default function ReceiptUpload({
  token,
  initialUrl,
  initialAt,
}: {
  token: string;
  initialUrl: string | null;
  initialAt: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [at, setAt] = useState(initialAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File) {
    setError("");
    setBusy(true);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: `/api/public/quotes/${token}/upload` });
      const res = await fetch(`/api/public/quotes/${token}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, name: file.name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar el comprobante.");
      setUrl(blob.url);
      setAt(data.receiptAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      {url && (
        <p className="mb-3 text-[14px] text-[#f1efe9]/80">
          ✓ Comprobante recibido
          {at && ` el ${new Date(at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`}.{" "}
          <a href={url} target="_blank" rel="noreferrer" className="underline">
            Ver
          </a>{" "}
          · Lo revisamos y confirmamos tu pago.
        </p>
      )}
      <label className={`pill-light inline-flex cursor-pointer !bg-[#f1efe9] ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? "Subiendo…" : url ? "Subir otro comprobante" : "Subir comprobante de pago"} <span aria-hidden>↑</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onFile(f);
          }}
        />
      </label>
      {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
      <p className="mt-3 text-[12px] text-[#f1efe9]/70">PDF o imagen, máximo 10 MB.</p>
    </div>
  );
}
