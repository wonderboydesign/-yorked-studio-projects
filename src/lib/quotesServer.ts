import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { DEFAULT_STUDIO, MAX_WORK_IMAGES, StudioData, StudioWork, slugify } from "./quotes";

// Liga privada de cada cotización: imposible de adivinar
export function newQuoteToken() {
  return randomBytes(18).toString("base64url");
}

export async function getStudio(): Promise<StudioData> {
  const row = await prisma.studioSettings.findUnique({ where: { id: "singleton" } });
  const data = (row?.data ?? {}) as Partial<StudioData>;
  return {
    ...DEFAULT_STUDIO,
    ...data,
    bank: { ...DEFAULT_STUDIO.bank, ...(data.bank ?? {}) },
    works: normalizeWorks(data.works ?? DEFAULT_STUDIO.works),
  };
}

// Limpia la lista de trabajos que llega del editor: solo texto, una liga
// http(s) y un id único (los trabajos guardados antes no tenían id)
export function normalizeWorks(input: unknown): StudioWork[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const url = (v: unknown) => (/^https?:\/\//i.test(str(v)) ? str(v) : undefined);
  return input
    .filter((w): w is Record<string, unknown> => !!w && typeof w === "object" && !!str((w as Record<string, unknown>).name))
    .map((w) => {
      const base = str(w.id) || slugify(str(w.name)) || "trabajo";
      let id = base;
      for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
      seen.add(id);
      // Antes había una sola foto (image); ahora una lista (images)
      const rawImages = Array.isArray(w.images) ? w.images : w.image ? [{ url: w.image, path: w.imagePath }] : [];
      const images = rawImages
        .map((im: unknown) => {
          const o = (im ?? {}) as Record<string, unknown>;
          const u = url(o.url);
          return u ? { url: u, path: str(o.path) || undefined } : null;
        })
        .filter((im): im is { url: string; path: string | undefined } => !!im)
        .slice(0, MAX_WORK_IMAGES);
      return {
        id,
        name: str(w.name),
        city: str(w.city),
        year: str(w.year),
        tone: /^#[0-9a-f]{3,8}$/i.test(str(w.tone)) ? str(w.tone) : "#e6e3da",
        kind: str(w.kind) || undefined,
        images,
        image: images[0]?.url,
        imagePath: images[0]?.path,
        link: url(w.link),
      };
    });
}

export const PROSPECT_FIELDS = [
  "brandName",
  "contact",
  "email",
  "phone",
  "city",
  "source",
  "category",
  "needs",
  "budget",
  "stage",
  "lostReason",
  "notes",
] as const;

export const PROSPECT_STAGE_KEYS = ["new", "quoted", "negotiating", "won", "lost"];

export function pickProspectFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const f of PROSPECT_FIELDS) {
    if (body[f] === undefined) continue;
    const v = typeof body[f] === "string" ? (body[f] as string).trim() : body[f];
    data[f] = v === "" ? null : v;
  }
  if (data.stage !== undefined && !PROSPECT_STAGE_KEYS.includes(data.stage as string)) delete data.stage;
  if (data.brandName === null) delete data.brandName;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  return data;
}

export const QUOTE_SUMMARY_SELECT = {
  id: true,
  token: true,
  status: true,
  viewCount: true,
  firstViewedAt: true,
  lastViewedAt: true,
  approvedAt: true,
  approvedOption: true,
  createdAt: true,
  updatedAt: true,
} as const;
