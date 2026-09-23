"use client";

import { useState } from "react";
import { User } from "@/lib/types";

export default function UserModal({
  user,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  user?: User | null;
  canDelete: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; password?: string }) => Promise<string | void>;
  onDelete?: (id: string) => Promise<string | void>;
}) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return;
    if (!user && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setError("");
    setSaving(true);
    const result = await onSave({ name, email, password: password || undefined });
    setSaving(false);
    if (result) setError(result);
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-md p-6 border border-line" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink mb-4">
          <span className="relative top-[1px] left-[-1px] inline-block text-accent">●</span>
          {user ? "Editar usuario" : "Nuevo usuario"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Contraseña {user && <span className="text-muted">(déjalo vacío para no cambiarla)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line px-3 py-2 text-xs focus:border-accent bg-surface text-ink"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {confirmingDelete ? (
            <div className="pt-2 space-y-3">
              <p className="text-xs">
                ¿Estás seguro que deseas eliminar a “{user?.name}”? Sus tareas quedarán sin asignar.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs px-3 py-2 border border-line"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user || !onDelete) return;
                    const result = await onDelete(user.id);
                    if (result) setError(result);
                  }}
                  className="text-xs px-3 py-2 bg-red-600 text-paper"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <div>
                {user && onDelete && canDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-xs text-red-600"
                  >
                    Eliminar usuario
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs px-3 py-2 border border-line"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !name || !email}
                  className="text-xs px-3 py-2 bg-ink text-paper disabled:opacity-40"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
