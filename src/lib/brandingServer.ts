import { del } from "@vercel/blob";
import { prisma } from "./prisma";

export const BRAND_STAGE_KEYS = ["brief", "concept", "research", "moodboard", "development", "presentation"];

const ITEM_STRING_FIELDS = ["title", "body", "url", "pathname", "contentType", "linkUrl", "status"] as const;

// Campos editables de una pieza que vienen del cliente; lo demás se ignora
export function pickItemFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of ITEM_STRING_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === "string" && body[field] !== "" ? body[field] : null;
    }
  }
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (typeof body.order === "number") data.order = body.order;
  if (body.boardId !== undefined) data.boardId = body.boardId || null;
  if (body.data !== undefined) {
    data.data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : null;
  }
  return data;
}

export const ITEM_INCLUDE = { author: { select: { id: true, name: true } } } as const;

// Devuelve el espacio de branding del proyecto, creándolo la primera vez
export async function ensureWorkspace(projectId: string) {
  return prisma.brandWorkspace.upsert({
    where: { projectId },
    update: {},
    create: { projectId },
  });
}

// Borra el archivo del Blob solo si se subió para esta pieza. Las piezas que
// vienen de la biblioteca de referencias no tienen pathname: el archivo es
// de la biblioteca y se queda.
export async function deleteBlobIfOwned(item: { url: string | null; pathname: string | null }) {
  if (item.url && item.pathname) {
    await del(item.url).catch(() => {});
  }
}
