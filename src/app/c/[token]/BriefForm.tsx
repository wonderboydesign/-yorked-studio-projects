"use client";

import { useEffect, useRef, useState } from "react";
import { BriefAnswers, BriefQuestion, answeredCount, hasAnswer } from "@/lib/brief";

const field = "w-full border border-black/20 bg-white px-4 py-3 text-[15px] text-[#111] outline-none focus:border-black";

// Formulario del brief dentro del portal: se guarda solo mientras el cliente
// escribe y lo envía con el botón al final
export default function BriefForm({
  token,
  intro,
  questions,
  initialAnswers,
  initialStatus,
  submittedAt,
  emails = [],
  whatsappUrl = "",
  projectName = "",
}: {
  token: string;
  intro: string | null;
  questions: BriefQuestion[];
  initialAnswers: BriefAnswers;
  initialStatus: string;
  submittedAt: string | null;
  emails?: string[];
  whatsappUrl?: string;
  projectName?: string;
}) {
  const [answers, setAnswers] = useState<BriefAnswers>(initialAnswers);
  const [status, setStatus] = useState(initialStatus);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const dirty = useRef<Record<string, string | string[]>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    const batch = dirty.current;
    if (Object.keys(batch).length === 0) return true;
    dirty.current = {};
    setSaved("saving");
    try {
      const res = await fetch(`/api/public/portal/${token}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: batch }),
      });
      if (!res.ok) throw new Error();
      setSaved("saved");
      return true;
    } catch {
      dirty.current = { ...batch, ...dirty.current };
      setSaved("error");
      return false;
    }
  }

  function change(id: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [id]: value }));
    dirty.current[id] = value;
    setError("");
    setMissing((m) => m.filter((x) => x !== id));
    if (status === "submitted") setStatus("draft");
    setSaved("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }

  // Guarda lo pendiente si cierra la pestaña
  useEffect(() => {
    const onHide = () => {
      if (Object.keys(dirty.current).length > 0) {
        fetch(`/api/public/portal/${token}/brief`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: dirty.current }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [token]);

  async function submit() {
    setError("");
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      const res = await fetch(`/api/public/portal/${token}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMissing(data?.missing ?? []);
        throw new Error(data?.error ?? "No se pudo enviar. Intenta de nuevo.");
      }
      dirty.current = {};
      setStatus("submitted");
      setSaved("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setBusy(false);
    }
  }

  const total = questions.length;
  const done = answeredCount(questions, answers);
  let lastSection = "";

  return (
    <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_2fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {intro && <p className="max-w-sm text-[15px] leading-relaxed text-black/70">{intro}</p>}
        <p className="mt-6 text-[13px] text-black/70">
          {done} de {total} respondidas
        </p>
        <div className="mt-2 h-1.5 max-w-xs overflow-hidden bg-black/10">
          <div className="h-full" style={{ width: `${total ? (done / total) * 100 : 0}%`, background: "var(--accent)" }} />
        </div>
        <p className="mt-3 text-[12px] text-black/70" aria-live="polite">
          {saved === "saving" ? "Guardando…" : saved === "saved" ? "✓ Guardado" : saved === "error" ? "No se pudo guardar; reintentamos al escribir" : "Se guarda solo mientras escribes"}
        </p>
      </aside>

      <div>
        {status === "submitted" && (
          <p className="mb-8 border border-black/15 px-5 py-4 text-[15px]">
            ✓ Recibimos tu brief{submittedAt ? ` el ${new Date(submittedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}` : ""}. Gracias. Si quieres cambiar algo, edítalo y vuelve a enviarlo.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-8"
        >
          {questions.map((q) => {
            const header = q.section && q.section !== lastSection ? q.section : null;
            if (q.section) lastSection = q.section;
            const value = answers[q.id];
            const isMissing = missing.includes(q.id);
            return (
              <div key={q.id}>
                {header && <p className="eyebrow mb-4 border-t border-black pt-4">{header}</p>}
                <label htmlFor={`bq-${q.id}`} className="block text-[17px] font-medium leading-snug">
                  {q.label}
                  {q.required && <span aria-hidden> *</span>}
                </label>
                {q.help && <p className="mt-1 text-[13px] text-black/70">{q.help}</p>}
                <div className="mt-3">
                  {q.type === "short" && (
                    <input id={`bq-${q.id}`} value={(value as string) ?? ""} onChange={(e) => change(q.id, e.target.value)} className={field} />
                  )}
                  {q.type === "long" && (
                    <textarea id={`bq-${q.id}`} value={(value as string) ?? ""} onChange={(e) => change(q.id, e.target.value)} rows={4} className={`${field} resize-y`} />
                  )}
                  {q.type === "choice" && (
                    <div className="space-y-2">
                      {(q.options ?? []).map((o) => (
                        <label key={o} className="flex items-center gap-3 text-[15px]">
                          <input type="radio" name={`bq-${q.id}`} checked={value === o} onChange={() => change(q.id, o)} className="h-4 w-4 accent-black" />
                          {o}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "multi" && <MultiField q={q} value={Array.isArray(value) ? value : []} onChange={(v) => change(q.id, v)} />}
                </div>
                {isMissing && !hasAnswer(value) && <p className="mt-2 text-[13px] text-[#b42318]">Esta pregunta es obligatoria.</p>}
              </div>
            );
          })}
          {(emails.length > 0 || whatsappUrl) && (
            <div className="border-t border-black pt-4">
              <p className="eyebrow mb-4">Referencias e información extra</p>
              <p className="text-[17px] font-medium leading-snug">Envía aquí todas las referencias que tengas e información extra</p>
              <p className="mt-1 text-[13px] text-black/70">Imágenes, links, logos actuales, documentos o lo que creas que nos ayude a conocer mejor tu marca.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {emails.map((e) => (
                  <a
                    key={e}
                    href={`mailto:${e}?subject=${encodeURIComponent(`Referencias${projectName ? ` · ${projectName}` : ""}`)}`}
                    className="border border-black/20 px-4 py-2.5 text-[14px] hover:border-black"
                  >
                    ✉ {e}
                  </a>
                ))}
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="border border-black/20 px-4 py-2.5 text-[14px] hover:border-black">
                    WhatsApp ↗
                  </a>
                )}
              </div>
            </div>
          )}
          <div className="border-t border-black pt-6">
            <button type="submit" disabled={busy} className="pill-dark disabled:opacity-60">
              {busy ? "Enviando…" : status === "submitted" ? "Volver a enviar mi brief" : "Enviar mi brief"} <span aria-hidden>→</span>
            </button>
            {error && <p className="mt-3 text-[14px] text-[#b42318]">{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}

function MultiField({ q, value, onChange }: { q: BriefQuestion; value: string[]; onChange: (v: string[]) => void }) {
  const options = q.options ?? [];
  const otherEntry = value.find((v) => v === "Otro" || v.startsWith("Otro: "));
  const toggle = (o: string) => {
    if (o === "Otro") onChange(otherEntry ? value.filter((v) => v !== otherEntry) : [...value, "Otro"]);
    else onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  };
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-3 text-[15px]">
            <input type="checkbox" checked={o === "Otro" ? !!otherEntry : value.includes(o)} onChange={() => toggle(o)} className="h-4 w-4 accent-black" />
            {o}
          </label>
        ))}
      </div>
      {otherEntry !== undefined && (
        <input
          value={otherEntry.startsWith("Otro: ") ? otherEntry.slice(6) : ""}
          onChange={(e) => onChange(value.map((v) => (v === otherEntry ? (e.target.value ? `Otro: ${e.target.value}` : "Otro") : v)))}
          placeholder="¿Cuál?"
          className={`${field} max-w-md`}
        />
      )}
    </div>
  );
}
