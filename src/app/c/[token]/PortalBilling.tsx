"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export interface PortalDoc {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

const date = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
const ALLOWED = ["pdf", "jpg", "jpeg", "png"];

// Facturación en el portal: el cliente sube su constancia de situación fiscal
// y descarga las facturas que el estudio sube
export default function PortalBilling({
  token,
  certificates,
  invoices,
  receipts = [],
  wantsInvoice = null,
}: {
  token: string;
  certificates: PortalDoc[];
  invoices: PortalDoc[];
  receipts?: { id: string; label: string; amount: string; paidAt: string; url: string }[];
  wantsInvoice?: boolean | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const latest = certificates[0];

  async function send(file: File) {
    setError("");
    setDone(false);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED.includes(ext)) return setError("Sube tu constancia en PDF, JPG o PNG.");
    if (file.size > 10 * 1024 * 1024) return setError("El archivo pesa más de 10 MB.");
    setBusy(true);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: `/api/public/portal/${token}/upload` });
      const res = await fetch(`/api/public/portal/${token}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, pathname: blob.pathname, name: file.name, contentType: file.type, size: file.size }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "No se pudo guardar.");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir. Intenta de nuevo o mándala por WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`mt-14 grid grid-cols-[minmax(0,1fr)] gap-3 ${receipts.length ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
      {/* Recibos de lo ya pagado (sin factura) */}
      {receipts.length > 0 && (
        <div className="flex flex-col rounded-[22px] bg-[#121210] p-6 text-[#f1efe9]">
          <p className="eyebrow" style={{ color: "rgb(241 239 233 / 0.5)" }}>Sin factura</p>
          <h3 className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.02em]">Tus recibos</h3>
          <ul className="mt-4">
            {receipts.map((r) => (
              <li key={r.id}>
                <a href={r.url} className="flex items-center justify-between gap-3 border-t border-white/15 py-3 text-[14px] hover:opacity-80">
                  <span className="min-w-0">
                    <span className="block truncate">{r.label}</span>
                    <span className="block text-[12px] text-[#f1efe9]/55">
                      {r.amount} · {new Date(r.paidAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#f1efe9] px-3 py-1 text-[12px] text-[#121210]">Descargar ↓</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Constancia */}
      <div className="flex flex-col rounded-[22px] border border-black/10 p-6">
        <p className="eyebrow">{wantsInvoice && !latest ? "Pediste factura · falta tu constancia" : "¿Requieres factura?"}</p>
        <h3 className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.02em]">Tu constancia de situación fiscal</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-black/60">
          Súbela aquí (PDF o foto legible) y con ella emitimos tus facturas. Si no requieres factura, descarga el recibo de cada
          pago en la sección de pagos.
        </p>
        <div className="mt-auto pt-6">
          {latest && (
            <a
              href={latest.url}
              target="_blank"
              rel="noreferrer"
              className="mb-3 flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-[14px] hover:opacity-70"
            >
              <span className="min-w-0 truncate">✓ {latest.name}</span>
              <span className="shrink-0 text-[12px] text-black/55">Recibida el {date(latest.createdAt)}</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={latest ? "pill-light" : "pill-dark"}
          >
            {busy ? "Subiendo…" : latest ? "Subir una nueva" : "Subir constancia"} <span aria-hidden>↑</span>
          </button>
          {done && <p className="mt-3 text-[13px]">Gracias, la recibimos.</p>}
          {error && <p className="mt-3 text-[13px] text-[#b42318]">{error}</p>}
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) send(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Facturas */}
      <div className="flex flex-col rounded-[22px] border border-black/10 p-6">
        <p className="eyebrow">Facturas</p>
        <h3 className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.02em]">Tus facturas</h3>
        {invoices.length === 0 ? (
          <p className="mt-2 text-[14px] leading-relaxed text-black/60">
            Cuando emitamos tu factura, aparecerá aquí para descargarla (PDF y XML).
          </p>
        ) : (
          <ul className="mt-4">
            {invoices.map((d) => (
              <li key={d.id}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center justify-between gap-3 border-t border-black/10 py-3 text-[14px] hover:opacity-70"
                >
                  <span className="min-w-0 truncate">{d.name}</span>
                  <span className="shrink-0 text-[12px] text-black/55">
                    {date(d.createdAt)} · Descargar ↓
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
