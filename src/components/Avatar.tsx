"use client";

// Iniciales (máx. 2) con un color estable por nombre
export default function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;

  return (
    <span
      title={name}
      aria-label={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundColor: `hsl(${hue} 55% 46%)`,
      }}
    >
      {initials || "?"}
    </span>
  );
}
