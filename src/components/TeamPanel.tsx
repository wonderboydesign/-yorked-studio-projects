"use client";

import { useEffect, useState } from "react";
import { User } from "@/lib/types";
import UserModal from "./UserModal";

export default function TeamPanel({
  users,
  currentUserId,
  onClose,
  onChanged,
}: {
  users: User[];
  currentUserId?: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [userModal, setUserModal] = useState<{ open: boolean; user?: User | null }>({
    open: false,
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !userModal.open) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, userModal.open]);

  async function saveUser(data: { name: string; email: string; password?: string }) {
    const res = await fetch(userModal.user ? `/api/users/${userModal.user.id}` : "/api/users", {
      method: userModal.user ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error || "No se pudo guardar el usuario";
    }
    setUserModal({ open: false });
    await onChanged();
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return body.error || "No se pudo eliminar el usuario";
    }
    setUserModal({ open: false });
    await onChanged();
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg w-full max-w-lg p-6 border border-line max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-xs uppercase tracking-wider">Equipo</h2>
          <button onClick={onClose} className="text-xs text-muted">
            Cerrar
          </button>
        </div>

        <div className="space-y-1 mb-4">
          {users.length === 0 && <p className="text-[10px] text-muted">No hay usuarios.</p>}
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setUserModal({ open: true, user: u })}
              className="w-full flex items-center justify-between border border-line rounded-md px-3 py-2 gap-2 text-left hover:bg-ink/[0.03]"
            >
              <div className="min-w-0">
                <p className="text-xs truncate">
                  {u.name} {u.id === currentUserId && <span className="text-muted">(tú)</span>}
                </p>
                <p className="text-[10px] text-muted truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setUserModal({ open: true, user: null })}
          className="text-xs px-3 py-1.5 rounded-md bg-ink text-paper"
        >
          + Usuario
        </button>
      </div>

      {userModal.open && (
        <UserModal
          user={userModal.user}
          canDelete={users.length > 1}
          onClose={() => setUserModal({ open: false })}
          onSave={saveUser}
          onDelete={deleteUser}
        />
      )}
    </div>
  );
}
