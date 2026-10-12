"use client";

import { useEffect, useRef, useState } from "react";
import { BrandItem, isImage } from "@/lib/branding";

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div className="min-w-0">
        <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-ink">{title}</h3>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`border border-line bg-surface rounded-3xl p-5 ${className}`}>{children}</section>;
}

export function Button({
  children,
  onClick,
  tone = "default",
  disabled,
  type = "button",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const tones = {
    default: "bg-button hover:bg-button-hover text-ink",
    primary: "bg-accent text-white hover:opacity-90",
    ghost: "text-muted hover:text-ink",
    danger: "text-muted hover:text-red-600",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

// Texto largo con guardado automático (al dejar de escribir y al salir del campo)
export function AutoText({
  value,
  onSave,
  placeholder,
  rows = 6,
  className = "",
}: {
  value: string | null;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const [state, setState] = useState<"idle" | "dirty" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastSaved = useRef(value ?? "");

  useEffect(() => {
    // Cambió desde fuera (otro proyecto, recarga): solo si no hay edición pendiente
    if (state !== "dirty") {
      setText(value ?? "");
      lastSaved.current = value ?? "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function flush(next = text) {
    clearTimeout(timer.current);
    if (next === lastSaved.current) return;
    lastSaved.current = next;
    onSave(next);
    setState("saved");
  }

  // Al salir de la etapa con algo pendiente, se guarda igual
  const pending = useRef({ text, onSave });
  pending.current = { text, onSave };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current.text !== lastSaved.current) pending.current.onSave(pending.current.text);
    },
    []
  );

  return (
    <div className="relative">
      <textarea
        value={text}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          setState("dirty");
          clearTimeout(timer.current);
          timer.current = setTimeout(() => flush(next), 1200);
        }}
        onBlur={() => flush()}
        className={`w-full resize-y bg-paper border border-line rounded-2xl px-4 py-3 text-sm leading-relaxed placeholder:text-muted focus:outline-none focus:border-ink/40 ${className}`}
      />
      <span className="absolute right-3 bottom-3 text-[11px] text-muted pointer-events-none">
        {state === "dirty" ? "Editando…" : state === "saved" ? "Guardado" : ""}
      </span>
    </div>
  );
}

export function InlineInput({
  value,
  onSave,
  placeholder,
  className = "",
}: {
  value: string | null;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => setText(value ?? ""), [value]);
  return (
    <input
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== (value ?? "") && onSave(text)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`w-full bg-transparent border-b border-transparent hover:border-line focus:border-ink/40 focus:outline-none placeholder:text-muted ${className}`}
    />
  );
}

export function InlineTextarea({
  value,
  onSave,
  placeholder,
  className = "",
}: {
  value: string | null;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setText(value ?? ""), [value]);
  // Crece con el contenido
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [text]);
  return (
    <textarea
      ref={ref}
      value={text}
      rows={1}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== (value ?? "") && onSave(text)}
      className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none placeholder:text-muted ${className}`}
    />
  );
}

export function DropZone({
  onFiles,
  label,
  accept,
  busy,
  compact,
}: {
  onFiles: (files: FileList) => void;
  label: string;
  accept?: string;
  busy?: boolean;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      className={`border border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
        over ? "border-accent bg-accent/5" : "border-line hover:border-ink/40"
      } ${compact ? "px-3 py-3" : "px-4 py-8"}`}
    >
      <p className="text-xs text-muted">{busy ? "Subiendo…" : label}</p>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
            value === o.key ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DeleteButton({ onConfirm, label = "Eliminar", confirmText }: {
  onConfirm: () => void;
  label?: string;
  confirmText?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!confirmText || window.confirm(confirmText)) onConfirm();
      }}
      className="text-[11px] text-muted hover:text-red-600 rounded-full"
    >
      {label}
    </button>
  );
}

export function FileThumb({ item, className = "" }: { item: Pick<BrandItem, "url" | "contentType" | "title">; className?: string }) {
  if (item.url && isImage(item.contentType, item.url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt={item.title ?? ""} loading="lazy" className={`w-full h-auto block ${className}`} />
    );
  }
  const ext = item.url?.split("?")[0].split(".").pop()?.toUpperCase() ?? "ARCHIVO";
  return (
    <div className={`flex items-center justify-center aspect-[4/3] bg-paper text-muted font-mono text-xs tracking-widest ${className}`}>
      {ext}
    </div>
  );
}

export function AddTextForm({
  placeholder,
  onAdd,
  withTitle,
  titlePlaceholder = "Título",
  submitLabel = "Agregar",
}: {
  placeholder: string;
  onAdd: (title: string, body: string) => Promise<unknown> | void;
  withTitle?: boolean;
  titlePlaceholder?: string;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const canSubmit = withTitle ? !!title.trim() : !!body.trim();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    await onAdd(title.trim(), body.trim());
    setTitle("");
    setBody("");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="border border-line rounded-2xl p-3 space-y-2 bg-paper">
      {withTitle && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted"
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-y bg-transparent text-sm focus:outline-none placeholder:text-muted"
      />
      <div className="flex justify-end">
        <Button type="submit" tone="primary" disabled={!canSubmit || busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
