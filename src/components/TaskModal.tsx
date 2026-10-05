"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Project, Task, User, Attachment, Status, STATUS_LABELS, STATUS_ORDER, STATUS_COLORS } from "@/lib/types";
import { toISODate, localToday } from "@/lib/date";

const ALLOWED_EXTENSIONS = ["ai", "svg", "pdf", "jpg", "jpeg", "png", "webp"];

const FIELD_CLASS =
  "bg-transparent text-ink text-sm outline-none rounded-lg px-2 py-1 -mx-2 hover:bg-ink/5 focus:bg-ink/5 transition-colors disabled:opacity-40";

type EditableField = "name" | "projectId" | "status" | "startDate" | "endDate" | "notes" | "assigneeId";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DashedIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-muted text-muted">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex max-w-full items-center">
      <select {...props} className={`${FIELD_CLASS} appearance-none cursor-pointer pr-6 text-right`}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2 text-muted"
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 4.5 6 7.5 9 4.5" />
      </svg>
    </span>
  );
}

function PropRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center gap-4 px-4 py-2">
      <div className="flex w-40 shrink-0 items-center gap-2.5 text-sm text-ink">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-sm">{children}</div>
    </div>
  );
}

export default function TaskModal({
  task,
  projects,
  users,
  defaultProjectId,
  defaultStartDate,
  onClose,
  onSave,
  onDelete,
  onAttachmentsChanged,
  onNotify,
}: {
  task?: Task | null;
  projects: Project[];
  users: User[];
  defaultProjectId?: string;
  defaultStartDate?: string;
  onClose: () => void;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onAttachmentsChanged?: () => void;
  onNotify?: (message: string, tone?: "ok" | "error") => void;
}) {
  const isEdit = !!task;
  const today = toISODate(localToday());
  const initialName = task?.name || "";
  const initialProjectId = task?.projectId || defaultProjectId || projects[0]?.id || "";
  const initialStatus: Status = task?.status || "TODO";
  const initialStartDate = task ? task.startDate.slice(0, 10) : defaultStartDate || today;
  const initialEndDate = task ? task.endDate.slice(0, 10) : defaultStartDate || today;
  const initialNotes = task?.notes || "";
  const initialAssigneeId = task?.assigneeId || "";

  const [name, setName] = useState(initialName);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [notes, setNotes] = useState(initialNotes);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments ?? []);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Último valor confirmado por el servidor, por campo (para no guardar de más)
  const savedRef = useRef<Record<EditableField, string>>({
    name: initialName,
    projectId: initialProjectId,
    status: initialStatus,
    startDate: initialStartDate,
    endDate: initialEndDate,
    notes: initialNotes,
    assigneeId: initialAssigneeId,
  });

  const notesLinks = Array.from(
    new Set(
      (notes.match(/https?:\/\/[^\s<>"']+/g) || []).map((url) =>
        url.replace(/[.,;:)\]}"']+$/, "")
      )
    )
  );

  const dirty =
    name !== initialName ||
    projectId !== initialProjectId ||
    status !== initialStatus ||
    startDate !== initialStartDate ||
    endDate !== initialEndDate ||
    notes !== initialNotes ||
    assigneeId !== initialAssigneeId;

  // Guarda un solo campo si cambió respecto a lo último guardado
  async function commit(field: EditableField, value: string) {
    if (!isEdit || value === savedRef.current[field]) return;
    if (field === "name" && !value.trim()) {
      setName(savedRef.current.name);
      return;
    }
    const previous = savedRef.current[field];
    savedRef.current[field] = value;
    try {
      const payload: Partial<Task> =
        field === "notes"
          ? { notes: value || null }
          : field === "assigneeId"
          ? { assigneeId: value || null }
          : ({ [field]: field === "status" ? (value as Status) : value } as Partial<Task>);
      await onSave(payload);
    } catch {
      savedRef.current[field] = previous;
      onNotify?.("No se pudo guardar el cambio.", "error");
    }
  }

  function attemptClose() {
    if (isEdit) {
      commit("name", name);
      commit("notes", notes);
      onClose();
      return;
    }
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") attemptClose();
      // Cmd/Ctrl + Enter: guarda y cierra (edición) o crea (nueva)
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isEdit) attemptClose();
        else formRef.current?.requestSubmit();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dirty, onClose, name, notes, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      commit("name", name);
      return;
    }
    if (!name || !projectId || !startDate || !endDate) return;
    setSaving(true);
    try {
      await onSave({
        name,
        projectId,
        status,
        startDate,
        endDate,
        notes: notes || null,
        assigneeId: assigneeId || null,
      });
    } catch {
      onNotify?.("No se pudo crear la tarea.", "error");
    }
    setSaving(false);
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || !task) return;
    setUploadError("");
    for (const file of Array.from(fileList)) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        setUploadError(
          `"${file.name}" no es un tipo permitido (${ALLOWED_EXTENSIONS.join(", ")}).`
        );
        continue;
      }
      setUploadingCount((n) => n + 1);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload-token",
        });
        const res = await fetch(`/api/tasks/${task.id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            url: blob.url,
            pathname: blob.pathname,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setAttachments((prev) => [...prev, created]);
          onAttachmentsChanged?.();
          onNotify?.("Archivo adjuntado");
        } else {
          setUploadError(`No se pudo guardar "${file.name}".`);
        }
      } catch (err) {
        let message = err instanceof Error ? err.message : `Error al subir "${file.name}".`;
        try {
          const diag = await fetch("/api/blob-upload-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "blob.generate-client-token",
              payload: { pathname: file.name, clientPayload: null, multipart: false },
            }),
          });
          if (!diag.ok) {
            const diagBody = await diag.json().catch(() => null);
            message = `[${diag.status}] ${diagBody?.error || message}`;
          }
        } catch {
          // el fetch de diagnóstico falló también; nos quedamos con el mensaje original
        }
        setUploadError(message);
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
  }

  async function handleDeleteAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    onAttachmentsChanged?.();
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-line bg-surface shadow-2xl"
      role="dialog"
      aria-label={isEdit ? "Editar tarea" : "Nueva tarea"}
    >
      <div className="flex items-center justify-between px-8 pt-6 pb-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink">
          <span className="relative top-[1px] left-[-1px] inline-block text-accent">●</span>
          {isEdit ? "Editar tarea" : "Nueva tarea"}
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.06] text-ink hover:bg-ink/10"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {projects.length === 0 ? (
          <p className="text-sm text-muted">
            Primero crea un proyecto para poder agregar tareas.
          </p>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
            <input
              aria-label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => commit("name", name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="Escribe el nombre de la tarea"
              autoFocus={!isEdit}
              className="w-full bg-transparent text-ink text-2xl font-semibold tracking-tight placeholder:text-muted outline-none"
            />

            <div className="divide-y divide-line/60 overflow-hidden rounded-2xl bg-ink/[0.04]">
              <PropRow
                icon={
                  <DashedIcon>
                    <path d="M3 6h6l2 2h10v11H3z" />
                  </DashedIcon>
                }
                label="Proyecto"
              >
                <Select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    commit("projectId", e.target.value);
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface">
                      {p.name}
                    </option>
                  ))}
                </Select>
              </PropRow>

              <PropRow
                icon={
                  <DashedIcon>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
                  </DashedIcon>
                }
                label="Asignado a"
              >
                <Select
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value);
                    commit("assigneeId", e.target.value);
                  }}
                >
                  <option value="" className="bg-surface">
                    Sin asignar
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-surface">
                      {u.name}
                    </option>
                  ))}
                </Select>
              </PropRow>

              <PropRow
                icon={
                  <DashedIcon>
                    <rect x="3" y="5" width="18" height="16" rx="1" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </DashedIcon>
                }
                label="Fecha inicio"
              >
                <input
                  type="date"
                  aria-label="Fecha inicio"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    commit("startDate", e.target.value);
                  }}
                  className={FIELD_CLASS}
                />
              </PropRow>

              <PropRow
                icon={
                  <DashedIcon>
                    <rect x="3" y="5" width="18" height="16" rx="1" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </DashedIcon>
                }
                label="Fecha fin"
              >
                <input
                  type="date"
                  aria-label="Fecha fin"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    commit("endDate", e.target.value);
                  }}
                  className={FIELD_CLASS}
                />
              </PropRow>

              <PropRow
                icon={
                  <DashedIcon>
                    <circle cx="12" cy="12" r="8" />
                  </DashedIcon>
                }
                label="Estado"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                  aria-hidden="true"
                />
                <Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as Status);
                    commit("status", e.target.value);
                  }}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s} className="bg-surface">
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </PropRow>
            </div>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-ink">Notas</h3>
                <button
                  type="button"
                  onClick={() => setNotesExpanded((v) => !v)}
                  className="text-xs text-muted hover:text-ink"
                >
                  {notesExpanded ? "Contraer" : "Expandir"}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => commit("notes", notes)}
                rows={notesExpanded ? 12 : 3}
                placeholder="¿De qué se trata esta tarea? URL, instrucciones o cualquier nota útil"
                className="w-full rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm text-ink placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/30 resize-y transition-[height,box-shadow]"
              />
              {notesLinks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {notesLinks.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 max-w-[220px] rounded-full bg-ink/[0.05] px-3 py-1 text-xs text-accent hover:bg-ink/10"
                      title={url}
                    >
                      <span className="truncate">{url}</span>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-semibold text-ink">Archivos</h3>
                {task && (
                  <label
                    className={`flex h-6 w-6 items-center justify-center rounded-full bg-ink/[0.06] text-base leading-none text-ink hover:bg-ink/10 ${
                      uploadingCount > 0 ? "opacity-40 cursor-wait" : "cursor-pointer"
                    }`}
                    title={uploadingCount > 0 ? "Subiendo…" : "Adjuntar archivo"}
                  >
                    +
                    <input
                      type="file"
                      multiple
                      accept=".ai,.svg,.pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        handleFilesSelected(e.target.files);
                        e.target.value = "";
                      }}
                      disabled={uploadingCount > 0}
                      className="hidden"
                    />
                  </label>
                )}
                {task && uploadingCount > 0 && <span className="text-xs text-muted">Subiendo…</span>}
              </div>
              {!task ? (
                <p className="text-xs text-muted">Guarda la tarea primero para poder adjuntar archivos.</p>
              ) : (
                <div className="space-y-2">
                  {attachments.length > 0 && (
                    <ul className="space-y-1">
                      {attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-ink/[0.04] px-3 py-2"
                        >
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 flex-1 text-sm truncate hover:underline"
                          >
                            {a.filename}
                          </a>
                          <span className="text-xs text-muted shrink-0">{formatBytes(a.size)}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(a.id)}
                            className="text-xs text-red-600 shrink-0"
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                </div>
              )}
            </section>

            {confirmingDelete ? (
              <div className="pt-2 space-y-3">
                <p className="text-sm">
                  ¿Estás seguro que deseas eliminar la tarea “{task?.name}”?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-full bg-ink/[0.06] px-4 py-2 text-sm text-ink hover:bg-ink/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => task && onDelete && onDelete(task.id)}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            ) : confirmingDiscard ? (
              <div className="pt-2 space-y-3">
                <p className="text-sm">
                  Tienes cambios sin guardar. Si sales ahora, se perderán.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDiscard(false)}
                    className="rounded-full bg-ink/[0.06] px-4 py-2 text-sm text-ink hover:bg-ink/10"
                  >
                    Seguir editando
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                  >
                    Salir sin guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <div>
                  {task && onDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="text-sm text-red-600"
                    >
                      Eliminar tarea
                    </button>
                  )}
                </div>
                {!isEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={attemptClose}
                      className="rounded-full bg-ink/[0.06] px-4 py-2 text-sm text-ink hover:bg-ink/10"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !name}
                      className="rounded-full bg-ink px-5 py-2 text-sm text-paper hover:opacity-90 disabled:opacity-40"
                    >
                      {saving ? "Creando…" : "Crear tarea"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </aside>
  );
}
