import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { QuoteContent } from "./quotes";
import { cleanItems, cleanOptionsDoc, cleanQuoteDoc } from "./supplierQuotes";
import { computeProgress, paymentsFromQuote } from "./portal";
import { localTodayUTC } from "./portalDates";

export function newPortalToken() {
  return randomBytes(18).toString("base64url");
}

// La propuesta del proyecto: la aprobada del prospecto ligado, o la más reciente
export async function projectQuote(projectId: string) {
  return prisma.quote.findFirst({
    where: { prospect: { projectId } },
    orderBy: [{ approvedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    include: { prospect: true },
  });
}

export async function projectProgress(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { name: true, status: true, startDate: true, endDate: true, phase: true },
  });
  return computeProgress(tasks, localTodayUTC());
}

// Si el proyecto aún no tiene pagos, los crea desde la propuesta aprobada
export async function ensurePayments(projectId: string) {
  const count = await prisma.payment.count({ where: { projectId } });
  if (count > 0) return 0;
  const quote = await projectQuote(projectId);
  if (!quote || quote.status !== "approved") return 0;
  const progress = await projectProgress(projectId);
  const rows = paymentsFromQuote(quote.content as unknown as QuoteContent, quote.approvedOption, quote.approvedAt, progress.end);
  await prisma.payment.createMany({ data: rows.map((r) => ({ ...r, projectId })) });
  // El precio completo del proyecto parte de la propuesta
  await prisma.project.updateMany({
    where: { id: projectId, priceTotal: null },
    data: { priceTotal: rows.reduce((n, r) => n + r.amount, 0) },
  });
  return rows.length;
}

export const PAYMENT_SELECT = { id: true, label: true, amount: true, dueDate: true, paidAt: true, withIva: true, order: true } as const;

const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null);

// Campos editables de un pago; fechas como "YYYY-MM-DD" o null
export function paymentFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim().slice(0, 120);
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    if (Number.isFinite(n) && n >= 0) data.amount = Math.round(n * 100) / 100;
  }
  if (body.dueDate !== undefined) data.dueDate = day(body.dueDate);
  if (body.paidAt !== undefined) data.paidAt = day(body.paidAt);
  if (typeof body.withIva === "boolean") data.withIva = body.withIva;
  return data;
}


export const DOCUMENT_SELECT = {
  id: true,
  kind: true,
  name: true,
  url: true,
  contentType: true,
  size: true,
  uploadedBy: true,
  createdAt: true,
} as const;

// Solo archivos que viven en el almacenamiento de Vercel Blob
export function isBlobUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export const CLIENT_UPLOAD_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
export const CLIENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const CLIENT_UPLOAD_MAX_FILES = 10;

// Folio legible del recibo de un pago: R-2026-AB12CD
export function receiptFolio(payment: { id: string; paidAt: Date | null; createdAt: Date }) {
  const year = (payment.paidAt ?? payment.createdAt).getUTCFullYear();
  return `R-${year}-${payment.id.slice(-6).toUpperCase()}`;
}

export const LINK_KINDS = ["delivery", "meeting", "brand"] as const;
export const LINK_SELECT = { id: true, kind: true, title: true, url: true, pathname: true, note: true, phase: true, date: true, createdAt: true } as const;

// Campos de un link del portal que llegan del panel; solo ligas http(s)
export function linkFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  if (typeof body.kind === "string" && (LINK_KINDS as readonly string[]).includes(body.kind)) data.kind = body.kind;
  const title = str(body.title, 160);
  if (title) data.title = title;
  if (body.url !== undefined) {
    const url = str(body.url, 2000) ?? "";
    // Vacío es válido (una entrega sin link); lo demás debe ser http(s)
    if (url === "" || /^https?:\/\/\S+$/i.test(url)) data.url = url;
  }
  if (body.pathname !== undefined) data.pathname = str(body.pathname, 500) || null;
  if (body.note !== undefined) data.note = str(body.note, 1000) || null;
  if (body.phase !== undefined) data.phase = str(body.phase, 4) || null;
  if (body.date !== undefined) {
    const d = typeof body.date === "string" && body.date ? new Date(body.date) : null;
    data.date = d && !Number.isNaN(d.getTime()) ? d : null;
  }
  return data;
}

// Campos editables de una cotización de proveedor que llegan del panel
export function supplierQuoteFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  const title = str(body.title, 160);
  if (title) data.title = title;
  if (body.supplier !== undefined) data.supplier = str(body.supplier, 160) || null;
  const kind = body.kind === "options" ? "options" : body.kind === "quote" ? "quote" : undefined;
  if (kind) data.kind = kind;
  if (body.doc !== undefined) data.doc = kind === "options" ? cleanOptionsDoc(body.doc) : cleanQuoteDoc(body.doc);
  if (body.items !== undefined) data.items = cleanItems(body.items);
  if (body.notes !== undefined) data.notes = str(body.notes, 2000) || null;
  if (body.validUntil !== undefined) data.validUntil = day(body.validUntil);
  if (typeof body.withIva === "boolean") data.withIva = body.withIva;
  if (typeof body.showFile === "boolean") data.showFile = body.showFile;
  if (body.view === "pdf" || body.view === "design") data.view = body.view;
  if (body.fileUrl !== undefined) data.fileUrl = isBlobUrl(body.fileUrl) ? body.fileUrl : null;
  if (body.filePath !== undefined) data.filePath = str(body.filePath, 500) || null;
  return data;
}
