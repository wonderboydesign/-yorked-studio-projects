import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { DEFAULT_STUDIO, StudioData } from "./quotes";

// Liga privada de cada cotización: imposible de adivinar
export function newQuoteToken() {
  return randomBytes(18).toString("base64url");
}

export async function getStudio(): Promise<StudioData> {
  const row = await prisma.studioSettings.findUnique({ where: { id: "singleton" } });
  const data = (row?.data ?? {}) as Partial<StudioData>;
  return { ...DEFAULT_STUDIO, ...data, bank: { ...DEFAULT_STUDIO.bank, ...(data.bank ?? {}) } };
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
