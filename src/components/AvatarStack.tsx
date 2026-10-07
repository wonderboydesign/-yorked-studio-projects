"use client";

import Avatar from "./Avatar";

// Varios avatares superpuestos; "—" si no hay nadie asignado
export default function AvatarStack({
  users,
  size = 20,
  max = 3,
}: {
  users: { id: string; name: string }[];
  size?: number;
  max?: number;
}) {
  if (users.length === 0) {
    return <span className="text-muted">—</span>;
  }

  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <span className="inline-flex items-center">
      {shown.map((u, i) => (
        <span
          key={u.id}
          className="rounded-full ring-2 ring-surface"
          style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.35), zIndex: shown.length - i }}
        >
          <Avatar name={u.name} size={size} />
        </span>
      ))}
      {extra > 0 && <span className="ml-1.5 text-xs text-muted">+{extra}</span>}
    </span>
  );
}
