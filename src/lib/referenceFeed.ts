// Conexión opcional con un dashboard de referencias externo. Si se define
// REFERENCES_FEED_URL, la biblioteca también muestra lo que devuelva esa URL
// (JSON). Se aceptan varias formas comunes para no obligar a un formato:
//   [ { id, title, imageUrl | image | url, sourceUrl | link, tags } ]
//   { items: [...] }  o  { references: [...] }
// Si el feed pide autenticación, REFERENCES_FEED_TOKEN se manda como Bearer.

import type { Reference } from "./branding";

type FeedEntry = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalize(entry: FeedEntry, index: number): Reference | null {
  const url = str(entry.imageUrl) ?? str(entry.image) ?? str(entry.thumbnail) ?? str(entry.url);
  if (!url) return null;
  const tags = Array.isArray(entry.tags)
    ? entry.tags.filter((t): t is string => typeof t === "string")
    : typeof entry.tags === "string"
    ? entry.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  return {
    id: `ext:${str(entry.id) ?? String(entry.id ?? index)}`,
    title: str(entry.title) ?? str(entry.name),
    url,
    pathname: null,
    sourceUrl: str(entry.sourceUrl) ?? str(entry.link) ?? (str(entry.imageUrl) ? str(entry.url) : null),
    tags,
    notes: str(entry.notes) ?? str(entry.description),
    createdAt: str(entry.createdAt) ?? new Date(0).toISOString(),
    external: true,
  };
}

export function isFeedConfigured() {
  return !!process.env.REFERENCES_FEED_URL;
}

export async function fetchExternalReferences(): Promise<Reference[]> {
  const feedUrl = process.env.REFERENCES_FEED_URL;
  if (!feedUrl) return [];

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.REFERENCES_FEED_TOKEN) {
    headers.Authorization = `Bearer ${process.env.REFERENCES_FEED_TOKEN}`;
  }

  const res = await fetch(feedUrl, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`El dashboard de referencias respondió ${res.status}`);
  const json = await res.json();
  const list: unknown = Array.isArray(json) ? json : json?.items ?? json?.references ?? json?.data;
  if (!Array.isArray(list)) return [];

  return list
    .map((entry, i) => (entry && typeof entry === "object" ? normalize(entry as FeedEntry, i) : null))
    .filter((r): r is Reference => r !== null);
}
