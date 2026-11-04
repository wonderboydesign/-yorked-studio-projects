"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/quotes";

export default function ApproveForm({
  token,
  options,
  defaultOption,
  whatsappUrl,
}: {
  token: string;
  options: { key: string; name: string; price: number }[];
  defaultOption: string;
  whatsappUrl: string;
}) {
  const router = useRouter();
  const [option, setOption] = useState(defaultOption);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !accepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/quotes/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option, name, email, note }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "No se pudo aprobar.");
      // La página se vuelve a pintar ya aprobada, con los datos para el anticipo
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aprobar.");
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl bg-white/10 px-4 py-3 text-[15px] text-[#f1efe9] placeholder:text-[#f1efe9]/45 outline-none focus:bg-white/15";

  return (
    <form onSubmit={submit} className="mt-10 grid max-w-2xl gap-3">
      {options.length > 1 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <label
              key={o.key}
              className={`cursor-pointer rounded-xl px-4 py-3 text-[13px] transition-colors ${
                option === o.key ? "bg-[#f1efe9] text-[#121210]" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <input
                type="radio"
                name="option"
                value={o.key}
                checked={option === o.key}
                onChange={() => setOption(o.key)}
                className="sr-only"
              />
              <span className="block opacity-60">Opción {o.key}</span>
              <span className="block text-[15px]">{o.name}</span>
              <span className="block opacity-70">{formatMoney(o.price)} MXN</span>
            </label>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={field} required />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo (opcional)"
          className={field}
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="¿Algo que debamos saber? (opcional)"
        className={`${field} resize-y`}
      />
      <label className="flex items-start gap-3 text-[13px] text-[#f1efe9]/80">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#f1efe9]"
        />
        Leí el alcance y las notas importantes, y apruebo esta propuesta.
      </label>
      {error && <p className="text-[13px] text-[#ffb4a8]">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!name.trim() || !accepted || busy}
          className="pill-light !bg-[#f1efe9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Aprobando…" : "Aprobar propuesta"} <span aria-hidden>→</span>
        </button>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="pill-outline">
          Escribir por WhatsApp
        </a>
      </div>
    </form>
  );
}
